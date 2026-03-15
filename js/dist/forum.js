(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);
const _extractText=flarum.core.compat["utils/extractText"];var extractText=t.n(_extractText);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){
  return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);
}

app().initializers.add("resofire-menu-control",function(){

  // ── oninit: once per IndexPage mount ─────────────────────────────────────
  // Cache the parsed order so navItems never JSON.parses on each redraw.
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
    this._menuControlShouldSync=!!(app().session.user&&app().session.user.isAdmin());
  });

  // ── navItems extend: discovery + ordering ─────────────────────────────────
  //
  // WHY extend (not override):
  // 'resofire-menu-control' sorts after all 'flarum-*' and 'fof-*' IDs, so our
  // initializer runs LAST. The last-registered extend fires LAST in the call
  // chain, meaning our callback sees items already populated by every other
  // extension. With override(), our replacement sits inside extensions that
  // registered after us, so original() only returns the inner (incomplete) items.
  _extend.extend(IndexPage().prototype,"navItems",function(items){

    // Discovery: once per mount (flag cleared immediately after first call)
    if(this._menuControlShouldSync){
      this._menuControlShouldSync=false;

      var menuKeys=Object.keys(items.toObject()).filter(function(k){return!isTagEntry(k);});

      var labels={};
      menuKeys.forEach(function(k){
        try{
          var text=extractText()(items.get(k));
          if(text&&text.trim())labels[k]=text.trim();
        }catch(e){}
      });

      // Always save both keys and labels so the admin panel reflects
      // the current state regardless of what was previously stored.
      app().request({
        method:"POST",
        url:app().forum.attribute("apiUrl")+"/settings",
        body:{
          "resofire-menu-control.known-keys":JSON.stringify(menuKeys),
          "resofire-menu-control.labels":JSON.stringify(labels)
        }
      }).catch(function(){});
    }

    // Apply saved order from instance cache — no JSON.parse per redraw.
    // setPriority mutates the ItemList in-place; extend() returns the original
    // object reference so our changes are reflected without an explicit return.
    var menuOrder=this._menuOrder;
    if(!menuOrder)return;
    var base=menuOrder.length+200;
    menuOrder.forEach(function(key,index){
      if(items.has(key)){items.setPriority(key,base-index);}
    });
  });

});

})(),module.exports=o})();
