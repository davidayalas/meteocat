var cache = CacheService.getPublicCache();
var db = ScriptDb.getMyDb();
var ttl = 1800; //same as cron

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
      'method' : 'post'
  });
  
  var output = [];
  
  var data = response.getContentText("iso-8859-1");
  data = data.slice(data.indexOf("<table"))
  data = getTagContent(data.slice(data.indexOf("<tbody")),false,"tbody");
      
  var rows = data.split("<tr"), cols, e;
  for(var i=1,z=rows.length;i<z;i++){
    cols = getTagContent(rows[i],false,"tr").split("<td");
    e = {};
    e["locality"] = replaces(getTagContent(cols[1],false,"td"));
    e["date"] = replaces(getTagContent(cols[4],false,"td"));
    e["tavg"] = replaces(getTagContent(cols[5],false,"td"));
    e["tmax"] = replaces(getTagContent(cols[6],false,"td"));
    e["tmin"] = replaces(getTagContent(cols[7],false,"td"));
    e["humidity"] = replaces(getTagContent(cols[8],false,"td"));
    output.push(e);
  }   
  cache.put("meteodata", JSON.stringify(output));
  var result = db.query({})
  while(result.hasNext()) {
    db.remove(result.next());
  }    
  db.save({id:1,timestmp:(new Date()).getTime(),data:output});
  return output;
}

/**
 * Get data from cache, db or live
 *
 * @return {Object}
 */
function getData(){
  var cached = cache.get("meteodata");
  var c;

  if(cached!=null){
    c=cached;
    Logger.log("from cache");
  }else{
    var result = db.query({id:1});
    if(result.getSize()>0){
      var current = result.next();
      if((((new Date()).getTime()-(new Date(current.timestmp)).getTime())/1000)<=ttl){
        c=current.data;
        Logger.log("from db");
      }else{
        c=meteo();
        Logger.log("from live");
      }
    }else{
      c=meteo();
      Logger.log("from live");
    }
  }
  return c;
}

/**
 *  The basic interface to a simple rest api over results
 *
 * @param {Object} e (request)
 * @return {String}
 */
function doGet(e) {
  var output = ContentService.createTextOutput();

  c = getData();
  
  var cb = "";
  
  //callback management
  if(e && e.parameters && e.parameters.callback){
    cb = e.parameters.callback + "(";
  }

  //stations searching
  if(e && e.parameters && e.parameters.stations){
    var st = dropDiacritics(e.parameters.stations.toString().toLowerCase()).split(",");
    c = JSON.parse(c);
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
    c=JSON.stringify(c);
  }
  
  return ContentService.createTextOutput(cb+c+(cb!=""?")":"")).setMimeType(ContentService.MimeType.JSON);;
}