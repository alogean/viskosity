require 'rubygems'
require 'find'
require 'nokogiri'
require 'rdf'
require 'rdf/ntriples'
require 'rdf/turtle'

include RDF

def show( element )
  if element != nil then 
    if !element.to_s.empty? then
      puts element
    end
  end
end

def add_to_catalog ( key, value, hash)
  if !hash.has_key? key 
    hash[key] = Array.new
  end
  hash[key] << value
end

def getfromxml ( doc, xpath )
  result = doc.xpath(xpath).first
  if !result.nil? 
    result.content
  else ""
  end  
end      

def xml_to_rdf
  # Open of a turtle writter with various prefixes
  RDF::Writer.for(:ntriples)
  RDF::Writer.open("sitg_skos_model.ttl",
    :base_uri => "http://www.sitg.ch/thesaurus/", 
    :prefixes => {
    nil     => "http://www.sitg.ch/thesaurus/ns#",
    :foaf   => "http://xmlns.com/foaf/0.1/",
    :rdf    => "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    :rdfs   => "http://www.w3.org/2000/01/rdf-schema#",
    :owl    => "http://www.w3.org/2002/07/owl#",
    :skos   => "http://www.w3.org/2004/02/skos/core#",
    :dct    => "http://purl.org/dc/terms/",
    :coll   => "http://www.sitg.ch/thesaurus/collections/",
    :schema => "http://www.sitg.ch/thesaurus/schema#"
  }) do |writer|   
    writer << RDF::Graph.new do |graph| 
      temp = Hash.new
      root_node = RDF::Node.new
      graph << RDF::Statement.new(root_node, RDF::type, RDF::SKOS.Concept)
      graph << RDF::Statement.new(root_node, RDF::SKOS.prefLabel, RDF::Literal.new("SITG", :language => :fr))    
      Find.find('./sitg_catalog_xml') do |path|
        if File.directory? path
           parent_node = RDF::Node.new
           name = path.split("/").last
           graph << RDF::Statement.new(parent_node, RDF::type, RDF::SKOS.Concept)
           graph << RDF::Statement.new(parent_node, RDF::SKOS.prefLabel, RDF::Literal.new(name, :language => :fr))
           graph << RDF::Statement.new(parent_node, RDF::SKOS.broader, root_node.to_s)
           temp[path] = parent_node
        else   
          parent_path_name = path.gsub("/" + path.split("/").last, "")
          name = path.split("/").last.gsub(".xml", "").gsub("_", " ")
          doc = Nokogiri::XML(File.open(File.open(path)), nil, 'UTF-8')
          title = getfromxml doc, '//idCitation/resTitle'
          organisation = getfromxml doc, '//rpOrgName'
          content = getfromxml doc, '//idAbs'
          definition = organisation + "\n\n" + content
          terminal_node = RDF::Node.new
          graph << RDF::Statement.new(terminal_node, RDF::type, RDF::SKOS.Concept)
          graph << RDF::Statement.new(terminal_node, RDF::SKOS.prefLabel, RDF::Literal.new(name, :language => :fr))
          graph << RDF::Statement.new(terminal_node, RDF::SKOS.altLabel, RDF::Literal.new(title, :language => :fr))
          graph << RDF::Statement.new(terminal_node, RDF::SKOS.definition, RDF::Literal.new(definition, :language => :fr))
          graph << RDF::Statement.new(terminal_node, RDF::SKOS.broader, temp[parent_path_name].to_s)
        end
      end
    end
  end
end

# rapper sitg_skos_model.ttl -i turtle -o rdfxml > sitg_skos_model.rdf
# cd /Users/ecolix/dev/projects_js/viskosity_fork
# python -m SimpleHTTPServer 8888 &
# 
xml_to_rdf
