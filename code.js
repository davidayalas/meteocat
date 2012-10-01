var ttl = 900; //same as cron
var geocoder = Maps.newGeocoder();
var isGeocoderAvailable = true;

/**
 * Remove all from cache and db
 *
 */
function removeCachedData(type){
  switch(type){
    case "all":
      dcache.remove({});
      break;
    case "stations":
      dcache.remove({type:'station'});
      break;
    case "data":
      dcache.remove('meteodata');
      break;
  }    
}

/**
 * Do replacements to clean text
 *
 * @param {String} str
 * @return {String}
 */
function replaces(str){
  return str.replace(/<[^>]*>/g," ")
            .replace(/[\t\r\n]/g,"")
            .replace(/\[.*\]/g,"")
            .replace(/^\s+|\s+$/g,"")
         ;
}  

/**
 * Get content between ">" and next closing "tag" (</tag)
 *
 * @param {String} str
 * @param {Boolean} isInitTagClosed
 *        if the split has been for a full tag "<tag>" or init "<tag"        
 * @param {String} tag
 *        tag to search
 * @return {String}
 */
function getTagContent(str,isInitTagClosed,tag){
  return str.slice((isInitTagClosed?0:str.indexOf(">")+1),str.indexOf("</"+tag));      
}  

/**
 * Drop accents and diacritics
 *
 * @param {String} str
 * @return {String}
 */
function dropDiacritics(str){
  try{
    str=decodeURIComponent(str);
  }catch(e){
    //str=str.toLowerCase();
  }
  var rExps=[
    {re:/[\xE0-\xE6]/g, ch:'a'},
    {re:/[\xE8-\xEB]/g, ch:'e'},
    {re:/[\xEC-\xEF]/g, ch:'i'},
    {re:/[\xF2-\xF6]/g, ch:'o'},
    {re:/[\xF9-\xFC]/g, ch:'u'},
    {re:/[\xF1]/g, ch:'n'},
    {re:/[\xE7]/g, ch:'c'},
  ];

  for(var i=0, len=rExps.length; i<len; i++){
    str=str.replace(rExps[i].re, rExps[i].ch);
  }
  return str;
}

/**
 * Get position from db or geocoder 
 *
 * @param {String} loc
 * @param {String} st
 *        station code
 * @return {Array}
 */
function getCoords(loc, st){
  var cached = dcache.get(st);
  
  if(cached && cached!=null){
    return cached.geo;
  }else{
    Logger.log("geo from geocoder");
    loc = loc.toLowerCase();
    var address = loc.replace(/\(.*\)/g,"").replace(/nord/g,"");
    if(address.indexOf("-")>-1){
      address = address.slice(address.indexOf("-")+1) + "," + address.slice(0,address.indexOf("-")-1);
    }
    var r = null;
    if(isGeocoderAvailable){
      try{
        r=geocoder.geocode(address + ",Catalonia,Spain");
      }catch(e){
        isGeocoderAvailable = false;
      }
    }
    if(r && r.results.length>0){
      dcache.put(st,{type:"station",geo:[r.results[0].geometry.location.lat,r.results[0].geometry.location.lng]});
      return [r.results[0].geometry.location.lat,r.results[0].geometry.location.lng];
    }else{
      return ["-","-"];
    }
  }
}  
  
/**
 * Fetch content with all the stations from meteo.cat and returns and caches a JSON object
 * This function is triggered by a cron from Google Apps Script
 *
 * @return {Object}
 */
function meteo(){
  var response = UrlFetchApp.fetch("http://www.meteo.cat/xema/AppJava/Mapper.do",{
    'payload' : {
        'inputSource':'SeleccioTotesEstacions', 
        'team':'ObservacioTeledeteccio'
      },
      'headers' : {
        'contentType' : 'text/html; charset=ISO-8859-1',
      },
      'method' : 'post',
      'muteHttpExceptions' : true
  });
  
  var output = [];
  
  var data = response.getContentText("iso-8859-1");
  
  if(!data || data.length==0){
    Logger.log("error in server response");
    Logger.log("retrieving last cached data");
    return dcache.get("meteodata",true);
  }
  
  data = data.slice(data.indexOf("<table"))
  data = getTagContent(data.slice(data.indexOf("<tbody")),false,"tbody");
      
  var rows = data.split("<tr"), cols, e, st, g;
  for(var i=1,z=rows.length;i<z;i++){
    cols = getTagContent(rows[i],false,"tr").split("<td");
    e = {};
    st = getTagContent(cols[1],false,"td");
    e["locality"] = replaces(st);
    st = st.split("<a");
    if(st.length>0 && st[1].indexOf("[")>-1){
      st = st[1].slice(st[1].indexOf("[")+1,st[1].lastIndexOf("]"));
    }
    e["date"] = replaces(getTagContent(cols[4],false,"td"));
    e["tavg"] = replaces(getTagContent(cols[5],false,"td"));
    e["tmax"] = replaces(getTagContent(cols[6],false,"td"));
    e["tmin"] = replaces(getTagContent(cols[7],false,"td"));
    e["humidity"] = replaces(getTagContent(cols[8],false,"td"));
    g = getCoords(e.locality, st);
    e["geo"] = {};
    e.geo["lat"] = g[0];
    e.geo["lng"] = g[1];
    output.push(e);
  }   

  dcache.put("meteodata", output, ttl);
  return output;  
}

/**
 * Get data from cache or live
 *
 * @return {Object}
 */
function getData(){
  var c = dcache.get("meteodata");
  if(!c){
    c = meteo();
  }
  return c;
}

/**
 *  The basic interface to a simple rest api over results
 *
 * @param {Object} e (request)
 * @return {String}
 */
function doGet(e){ 
  var output = ContentService.createTextOutput();
      
  //force refresh data
  if(e && e.parameters && e.parameters.refresh && e.parameters.refresh!=""){
    removeCachedData(e.parameters.refresh);
  }

  //dcache.remove("meteodata")
  c = getData();

  var cb = "";
  
  //callback management
  if(e && e.parameters && e.parameters.callback){
    cb = e.parameters.callback + "(";
  }

  //stations searching
  if(c && e && e.parameters && e.parameters.stations){
    var st = dropDiacritics(e.parameters.stations.toString().toLowerCase()).split(",");
    c = c.filter(function(it){
      found = false;
      for(var i=0,z=st.length;i<z;i++){
        if(dropDiacritics(it.locality.toLowerCase()).indexOf(st[i])>-1){
          found = true;
          break;
        }  
      }
      return found;
    });
  }
  
  if(typeof c=="object"){
    c = JSON.stringify(c);
  }
  
  return ContentService.createTextOutput(cb+c+(cb!=""?")":"")).setMimeType(ContentService.MimeType.JSON);;
}