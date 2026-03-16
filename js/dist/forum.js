(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);
const _extractText=flarum.core.compat["utils/extractText"];var extractText=t.n(_extractText);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

// Fire discovery POST at most once per page load (admin only).
var synced=false;

app().initializers.add("resofire-menu-control",function(){

  _extend.extend(IndexPage().prototype,"oninit",function(){
    var rawOrder=app().forum.attribute("menuControlOrder");
    this._menuOrder=null;
    if(rawOrder){
      try{
        var parsed=JSON.parse(rawOrder);
        if(Array.isArray(parsed)&&parsed.length>0){
          this._menuOrder=parsed.filter(function(k){return!isTagEntry(k);});
        }
      }catch(e){}
    }
  });

  // Intercept toArray() on the navItems ItemList.
  // This fires AFTER all extensions have added their items (the extend chain
  // has fully resolved), so we see every real key with its real label.
  // We use this for two purposes:
  //   1. Apply the saved order (priorities) before the sort runs.
  //   2. Discover and persist real keys+labels to DB (admin only, once per session).
  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var self=this;
    var menuOrder=self._menuOrder;

    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){

      // ── 1. Discovery: save real keys+labels to DB ──────────────────────────
      // Runs once per page load for admins. At toArray() time every extension
      // has already added its items, so keys and labels are the ground truth.
      if(!synced&&app().session.user&&app().session.user.isAdmin()){
        synced=true;
        var realKeys=Object.keys(items.toObject()).filter(function(k){return!isTagEntry(k);});
        var labels={};
        realKeys.forEach(function(k){
          try{
            var txt=extractText()(items.get(k));
            if(txt&&txt.trim())labels[k]=txt.trim();
          }catch(e){}
        });
        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:{
            "resofire-menu-control.known-keys":JSON.stringify(realKeys),
            "resofire-menu-control.labels":JSON.stringify(labels)
          }
        }).catch(function(){});
      }

      // ── 2. Apply saved order ───────────────────────────────────────────────
      if(menuOrder){
        var base=menuOrder.length+200;
        menuOrder.forEach(function(key,index){
          if(items.has(key)){items.setPriority(key,base-index);}
        });
      }

      // Restore original toArray so subsequent redraws don't re-wrap.
      items.toArray=origToArray;
      return origToArray(keepPrimitives);
    };
  });

});

})(),module.exports=o})();
