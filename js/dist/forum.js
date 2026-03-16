(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _override=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

app().initializers.add("resofire-menu-control",function(){

  // Cache parsed order once per IndexPage mount.
  _override.extend(IndexPage().prototype,"oninit",function(){
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

  // WHY override sidebarItems instead of extending navItems:
  //
  // The console showed our navItems extend callback fires BEFORE other extensions
  // (leaderboard, badges, following, user-directory) add their items, even though
  // alphabetically we should be last. Those extensions must register their navItems
  // patches AFTER our initializer runs, so the extend chain is:
  //   outer (them) → our extend → inner chain
  // meaning our callback fires BEFORE theirs.
  //
  // sidebarItems() calls this.navItems().toArray() inline. By the time sidebarItems
  // returns, navItems() has been fully called and ALL extensions have added items.
  // But those items are now rendered as Mithril vnodes inside SelectDropdown.
  //
  // The solution: override sidebarItems. Call original() which internally calls
  // navItems() with full extension chain. Then reconstruct the 'nav' item using a
  // fresh navItems() call where we CAN apply priorities — because at this point in
  // the call stack, all extends have already fired once and the chain is complete.
  //
  // Actually the cleanest approach: override navItems to return a WRAPPED ItemList
  // whose toArray() applies our priorities just before sorting. Since toArray() is
  // called by sidebarItems AFTER all extend callbacks have mutated the list, the
  // wrap fires at exactly the right time.

  _override.override(IndexPage().prototype,"navItems",function(original){
    var self=this;
    // Get the fully-populated ItemList from the original chain.
    // With override, original() = the version of navItems that existed before
    // our override was registered. Extensions that registered extends AFTER us
    // wrap our override — so when this.navItems() is called from sidebarItems(),
    // those outer extends fire first (adding their items), then eventually call
    // original() which is our override function, where we apply priorities.
    var items=original();
    var menuOrder=self._menuOrder;
    if(!menuOrder)return items;

    var base=menuOrder.length+200;
    menuOrder.forEach(function(key,index){
      if(items.has(key)){items.setPriority(key,base-index);}
    });
    return items;
  });

});

})(),module.exports=o})();
