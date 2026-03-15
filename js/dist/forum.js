(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);

// Compiled once at module load
var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){
  return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);
}

app().initializers.add("resofire-menu-control",function(){

  // ── oninit: once per IndexPage mount ─────────────────────────────────────
  // Parse and cache the order so navItems never has to JSON.parse on each redraw.
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
    // Flag for one-time key discovery on first navItems call this mount
    if(app().session.user&&app().session.user.isAdmin()){
      this._menuControlShouldSync=true;
    }
  });

  // ── navItems: every redraw — minimal work, reads from instance cache ──────
  _extend.extend(IndexPage().prototype,"navItems",function(items){
    // Discovery: runs once per mount (flag cleared after first navItems call)
    if(this._menuControlShouldSync){
      this._menuControlShouldSync=false;
      var discoveredKeys=Object.keys(items.toObject()).filter(function(k){return!isTagEntry(k);});
      var rawKnown=app().forum.attribute("menuControlKnownKeys");
      var knownKeys=[];
      try{knownKeys=rawKnown?JSON.parse(rawKnown):[]}catch(e){knownKeys=[];}
      var merged=knownKeys.slice();
      var changed=false;
      discoveredKeys.forEach(function(k){
        if(merged.indexOf(k)===-1){merged.push(k);changed=true;}
      });
      if(changed){
        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:{"resofire-menu-control.known-keys":JSON.stringify(merged)}
        }).catch(function(){});
      }
    }

    // Apply order from instance cache — no parsing, no filtering on each redraw
    var menuOrder=this._menuOrder;
    if(!menuOrder)return;
    var base=menuOrder.length+200;
    menuOrder.forEach(function(key,index){
      if(items.has(key)){items.setPriority(key,base-index);}
    });
  });

});

})(),module.exports=o})();
