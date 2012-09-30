/*
*
* Singleton object for cache management with persitence in cache and in db
*
*/

var dcache = {
  cache : CacheService.getPublicCache(),
  db : ScriptDb.getMyDb(),
  
 /**
  * Sets a key
  *
  * @param {String} key
  * @param {String, Object} value
  * @param {Number} ttl
  */  
  put : function(key, value, ttl){
    this.remove({'id':key});
    value = typeof value=="object" ? JSON.stringify(value) : value;
    if(ttl){
      this.cache.put(key,value,ttl);
      this.db.save({id:key,timestmp:(new Date()).getTime(),data:value,'ttl':ttl});
    }else{
      this.cache.put(key,value);
      this.db.save({id:key,timestmp:(new Date()).getTime(),data:value});
    }
  },
  
 /**
  * Gets a key
  *
  * @param {String} key
  * @param {Boolean} retrieveLast
  *        to force the return of last value           
  * @return {Object}
  */  
  get : function(key,retrieveLast){
    var cached = this.cache.get(key);
    var v=null;
    if(cached!=null){
      v=cached;
      Logger.log(key + " from cache");
    }else{
      var result = this.db.query({id:key});
      if(result.getSize()>0){
        var current = result.next();
        if(current==null){return null;}
        if(retrieveLast || current.ttl==undefined || (((new Date()).getTime()-(new Date(current.timestmp)).getTime())/1000)<=current.ttl){
          v=current.data;
          this.cache.put(key, v);
          Logger.log(key + " from db");
        }
      }
    }
    v = v==undefined || v=="undefined"?null:v;
    return v && (v.indexOf("{")>-1 || v.indexOf("[")>-1)?JSON.parse(v):v;
  },
  
 /**
  * Remove contents in cache from a query or key
  *
  */  
  remove : function(q){
    if(typeof(q)=="string"){
      var a=q;
      q={};
      q["id"] = a;
    }
    var r = this.db.query(q);
    if(r.getSize()>0){
      var c;
      while(r.hasNext()){
        c = r.next();
        this.db.remove(c);
        this.cache.remove(c.id);
        Logger.log("deleting "+c.id);
      }    
    }
  }
  
}