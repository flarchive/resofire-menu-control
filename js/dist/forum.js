(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);
const _extractText=flarum.core.compat["utils/extractText"];var extractText=t.n(_extractText);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

// Fire the labels POST at most once per page load (admin only).
var labelsSynced=false;

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

  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var self=this;
    var menuOrder=self._menuOrder;

    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){

      // Save real display labels to DB (admin only, once per page load).
      // At toArray() time every extension has added its items, so extractText()
      // gives us the actual rendered label text (e.g. "Pick'em", "Awards").
      // PHP uses the raw key as a fallback label; this POST provides the real ones.
      if(!labelsSynced&&app().session.user&&app().session.user.isAdmin()){
        labelsSynced=true;
        var labels={};
        Object.keys(items.toObject()).forEach(function(k){
          if(isTagEntry(k))return;
          try{
            var txt=extractText()(items.get(k));
            if(txt&&txt.trim())labels[k]=txt.trim();
          }catch(e){}
        });
        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:{"resofire-menu-control.labels":JSON.stringify(labels)}
        }).catch(function(){});
      }

      // Apply saved order before the sort runs.
      if(menuOrder){
        var base=menuOrder.length+200;
        menuOrder.forEach(function(key,index){
          if(items.has(key)){items.setPriority(key,base-index);}
        });
      }

      items.toArray=origToArray;
      return origToArray(keepPrimitives);
    };
  });

});

})(),module.exports=o})();
