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
    Logger.log("put >>>" + value)
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
      //Logger.log("data from cache");
    }else{
      var result = this.db.query({id:key});
      if(result.getSize()>0){
        var current = result.next();
        if(retrieveLast || current.ttl==undefined || (((new Date()).getTime()-(new Date(current.timestmp)).getTime())/1000)<=current.ttl){
          v=current.data;
          this.cache.put(key, v);
          //Logger.log("data from db");
        }
      }
    }
    return typeof v=="object"?JSON.parse(v):v;
  },
  
 /**
  * Remove contents in cache from a query
  *
  */  
  remove : function(q){
    Logger.log(">"+JSON.stringify(q))
    var r = this.db.query(q);
    if(r.getSize()>0){
      var c;
      while(r.hasNext()){
        c = r.next();
        this.db.remove(c);
        this.cache.remove(c.id);
      }    
    }
  }
  
}