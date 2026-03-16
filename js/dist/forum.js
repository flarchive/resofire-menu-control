(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);
const _extractText=flarum.core.compat["utils/extractText"];var extractText=t.n(_extractText);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

var labelsSynced=false;

app().initializers.add("resofire-menu-control",function(){

  // Toggle body class for sticky sidebar — cleaner than mutating view() vnode attrs.
  _extend.extend(IndexPage().prototype,"oninit",function(){
    if(app().forum.attribute("menuControlSticky")){
      document.body.classList.add("resofire-sticky-nav");
    }
  });

  _extend.extend(IndexPage().prototype,"onremove",function(){
    document.body.classList.remove("resofire-sticky-nav");
  });

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
    this._menuFlip=!!app().forum.attribute("menuControlFlip");
    var rawHidden=app().forum.attribute("menuControlGuestHidden");
    this._guestHidden=(Array.isArray(rawHidden)&&rawHidden.length>0&&!app().session.user)
      ? rawHidden : null;
  });

  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var self=this;
    var menuOrder=self._menuOrder;
    var menuFlip=self._menuFlip;

    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){

      // Save real labels AND icons (admin only, once per page load).
      // icons: read vnode.attrs.icon from each nav item vnode.
      if(!labelsSynced&&app().session.user&&app().session.user.isAdmin()){
        labelsSynced=true;
        var labels={};
        var icons={};
        Object.keys(items.toObject()).forEach(function(k){
          if(isTagEntry(k))return;
          try{
            var vnode=items.get(k);
            var txt=extractText()(vnode);
            if(txt&&txt.trim())labels[k]=txt.trim();
            // Icon is in vnode.attrs.icon (e.g. "fas fa-star", "far fa-comments")
            if(vnode&&vnode.attrs&&vnode.attrs.icon){
              icons[k]=vnode.attrs.icon;
            }
          }catch(e){}
        });
        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:{
            "resofire-menu-control.labels":JSON.stringify(labels),
            "resofire-menu-control.icons":JSON.stringify(icons)
          }
        }).catch(function(){});
      }

      // Remove items hidden from guests (only when not logged in)
      var guestHidden=self._guestHidden;
      if(guestHidden){
        guestHidden.forEach(function(key){
          if(items.has(key)){items.remove(key);}
        });
      }

      if(menuOrder&&menuOrder.length>0){
        var base=menuOrder.length+200;
        menuOrder.forEach(function(key,index){
          if(items.has(key)){items.setPriority(key,base-index);}
        });
      }

      // Only apply flip on desktop — on mobile/tablet the nav renders as a
      // horizontal SelectDropdown where flip doesn't make sense.
      // app().screen() returns 'phone'|'tablet'|'desktop'|'desktop-hd'
      var isDesktop=app().screen()==="desktop"||app().screen()==="desktop-hd";
      if(menuFlip&&isDesktop){
        var allKeys=Object.keys(items.toObject());
        var navKeys=[];
        allKeys.forEach(function(k){
          if(!isTagEntry(k)&&items.getPriority(k)>0){navKeys.push(k);}
        });
        navKeys.sort(function(a,b){return items.getPriority(b)-items.getPriority(a);});
        navKeys.forEach(function(k,i){items.setPriority(k,-(201+i));});
        allKeys.forEach(function(k){
          if(k==="separator"){items.setPriority(k,0);}
          else if(isTagEntry(k)){items.setPriority(k,-items.getPriority(k));}
        });
      }

      items.toArray=origToArray;
      return origToArray(keepPrimitives);
    };
  });



});

})(),module.exports=o})();
