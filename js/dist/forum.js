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

  // ── navItems override: sees the COMPLETE item list from all extensions ────
  // override() means original() runs the full extend chain before we inspect items.
  // Using extend() here would fire our callback before outer extensions add theirs.
  _extend.override(IndexPage().prototype,"navItems",function(original){
    var items=original(); // Full chain: core + ALL extension extends

    // Discovery: once per mount, admin only
    if(this._menuControlShouldSync){
      this._menuControlShouldSync=false;

      var discoveredKeys=Object.keys(items.toObject()).filter(function(k){return!isTagEntry(k);});

      // Extract human-readable label from each item's vnode
      var labels={};
      discoveredKeys.forEach(function(k){
        try{
          var text=extractText()(items.get(k));
          if(text&&text.trim())labels[k]=text.trim();
        }catch(e){}
      });

      var rawKnown=app().forum.attribute("menuControlKnownKeys");
      var knownKeys=[];
      try{knownKeys=rawKnown?JSON.parse(rawKnown):[]}catch(e){knownKeys=[];}
      var merged=knownKeys.slice();
      var changed=false;
      discoveredKeys.forEach(function(k){
        if(merged.indexOf(k)===-1){merged.push(k);changed=true;}
      });

      var body={"resofire-menu-control.labels":JSON.stringify(labels)};
      if(changed){body["resofire-menu-control.known-keys"]=JSON.stringify(merged);}
      app().request({
        method:"POST",
        url:app().forum.attribute("apiUrl")+"/settings",
        body:body
      }).catch(function(){});
    }

    // Apply saved order from instance cache — no JSON.parse per redraw
    var menuOrder=this._menuOrder;
    if(!menuOrder)return items;
    var base=menuOrder.length+200;
    menuOrder.forEach(function(key,index){
      if(items.has(key)){items.setPriority(key,base-index);}
    });
    return items;
  });

});

})(),module.exports=o})();
