(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);

// Returns true for keys that are tag entries added by flarum/tags,
// not reorderable menu items: 'separator', 'moreTags', 'tag1', 'tag2' ...
function isTagEntry(key){
  return key==="separator"||key==="moreTags"||/^tag\d+$/.test(key);
}

app().initializers.add("resofire-menu-control",function(){
  _extend.override(IndexPage().prototype,"navItems",function(original){
    var items=original();

    // ── 1. Persist discovered menu keys (tag entries excluded) ──────────────
    if(!app()._menuControlKeysSynced){
      app()._menuControlKeysSynced=true;
      var discoveredKeys=Object.keys(items.toObject()).filter(function(k){return!isTagEntry(k)});
      var rawKnown=app().forum.attribute("menuControlKnownKeys");
      var knownKeys=[];
      try{knownKeys=rawKnown?JSON.parse(rawKnown):[]}catch(e){knownKeys=[]}
      var merged=knownKeys.slice();
      var changed=false;
      discoveredKeys.forEach(function(k){
        if(merged.indexOf(k)===-1){merged.push(k);changed=true;}
      });
      if(changed&&app().session.user&&app().session.user.isAdmin()){
        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:{"resofire-menu-control.known-keys":JSON.stringify(merged)}
        }).catch(function(){});
      }
    }

    // ── 2. Apply the saved order ─────────────────────────────────────────────
    var rawOrder=app().forum.attribute("menuControlOrder");
    if(!rawOrder)return items;
    var order;
    try{order=JSON.parse(rawOrder)}catch(e){return items}
    if(!Array.isArray(order)||order.length===0)return items;

    // Strip any tag entries that may have been saved before this fix
    var menuOrder=order.filter(function(k){return!isTagEntry(k)});

    // Use base 200+ so ordered items always float well above tag entries (-14)
    var base=menuOrder.length+200;
    menuOrder.forEach(function(key,index){
      if(items.has(key)){items.setPriority(key,base-index);}
    });
    // Tag entries and unordered items are left at their original priorities

    return items;
  });
});

})(),module.exports=o})();
