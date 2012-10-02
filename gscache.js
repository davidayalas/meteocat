/*
*
* Singleton object for cache management with persitence in cache and in db
*
*/

var gscache = {
  cache : CacheService.getPublicCache(),
  db : ScriptDb.getMyDb(),
  keyprefix : "gscache_",
  
 /**
  * Sets a key
  *
  * @param {String} key
  * @param {String, Object} value
  * @param {Number} ttl
  */  
  put : function(key, value, ttl){
    if(typeof(key)!="string"){
      Logger.log("key has to be a string");
      return;
    }
    key = this.keyprefix + key;
    this.remove(key);
    var valuec = typeof value=="object" ? JSON.stringify(value) : value;
    if(ttl){
      this.cache.put(key,valuec,ttl);
      this.db.save({id:key,timestmp:(new Date()).getTime(),data:value,'ttl':ttl});
    }else{
      this.cache.put(key,valuec);
      this.db.save({id:key,timestmp:(new Date()).getTime(),data:value});
    }
  },
  
 /**
  * Gets a key
  *
  * @param {String, Object} key
  *        Query by id has to be string
  * @param {Boolean} retrieveLast
  *        to force the return of last value           
  * @return {Object,String,Iterator}
  */  
  get : function(key,retrieveLast){
    var v=null, cached=null;

    if(typeof(key)=="string" || !isNaN(key)){
      key = this.keyprefix + key;
    }

    cached = this.cache.get(key);
    
    if(cached!=null){
      v = cached;
      Logger.log(key.replace(this.keyprefix,"") + " from cache");
    }else{ //db key id
      var result = null;
      if(typeof(key)=="string"){
        result = this.db.query({id:key});
        if(result.getSize()>0){
          var current = result.next();
          if(current==null){return null;}
          if(retrieveLast || current.ttl==undefined || (((new Date()).getTime()-(new Date(current.timestmp)).getTime())/1000)<=current.ttl){
            v=current.data;
            v = typeof(v)=="object"?v.toJson():v;
            this.cache.put(key, typeof(v)=="object"?JSON.stringify(v):v);
            Logger.log(key.replace(this.keyprefix,"") + " from db id");
          }
        }
      }else{ //query
        Logger.log(JSON.stringify(key) + " from db query");
        var result = this.db.query({data:key});
        return result.getSize()>0?result:null;
      }
    }

    try{
      v = JSON.parse(v);
    }catch(e){
      //...
    } 
    return v;
  },
  
 /**
  * Remove contents in cache from a query or key
  * Query by id has to be string.
  */  
  remove : function(q){
    if(typeof(q)=="string"){
      var a=q;
      q={};
      q["id"] = this.keyprefix + a;
    }else{
      q = {data:q};
    }
    var r = this.db.query(q);
    if(r.getSize()>0){
      var c;
      while(r.hasNext()){
        c = r.next();
        this.db.remove(c);
        this.cache.remove(c.id);
        Logger.log("deleting "+c.id.replace(this.keyprefix,""));
      }    
    }
  }
}