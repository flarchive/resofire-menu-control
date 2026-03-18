(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);
const _extractText=flarum.core.compat["utils/extractText"];var extractText=t.n(_extractText);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

// Parse and cache settings once at boot — available regardless of which
// component calls navItems() (IndexPage or blog's ForumNav).
function getMenuSettings(){
  var rawOrder=app().forum.attribute("menuControlOrder");
  var menuOrder=null;
  if(rawOrder){
    try{
      var parsed=JSON.parse(rawOrder);
      if(Array.isArray(parsed)&&parsed.length>0){
        menuOrder=parsed.filter(function(k){return!isTagEntry(k);});
      }
    }catch(e){}
  }
  // Parse custom links
  var customLinksRaw=app().forum.attribute("menuControlCustomLinks");
  var customLinks=[];
  try{customLinks=Array.isArray(customLinksRaw)?customLinksRaw:[];}catch(e){}

  return{
    menuOrder:menuOrder,
    menuFlip:!!app().forum.attribute("menuControlFlip"),
    customIcons:app().forum.attribute("menuControlCustomIcons")||{},
    highlighted:app().forum.attribute("menuControlHighlighted")||[],
    customLinks:customLinks
  };
}

// Set CSS custom properties for highlight color — called once at boot.
function applyHighlightColor(){
  var hlColor=app().forum.attribute("menuControlHighlightColor");
  if(hlColor&&hlColor.trim()){
    var hex=hlColor.trim();
    document.documentElement.style.setProperty("--mc-highlight-color",hex);
    var r=0,g=0,b=0;
    var h=hex.replace("#","");
    if(h.length===3){h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];}
    if(h.length===6){
      r=parseInt(h.substring(0,2),16);
      g=parseInt(h.substring(2,4),16);
      b=parseInt(h.substring(4,6),16);
    }
    document.documentElement.style.setProperty("--mc-highlight-bg","rgba("+r+","+g+","+b+",0.35)");
  }
}

var labelsSynced=false;

app().initializers.add("resofire-menu-control",function(){

  // Sticky sidebar and label/icon discovery remain tied to IndexPage lifecycle.
  _extend.extend(IndexPage().prototype,"oninit",function(){
    if(app().forum.attribute("menuControlSticky")){
      document.body.classList.add("resofire-sticky-nav");
    }
  });

  _extend.extend(IndexPage().prototype,"onremove",function(){
    document.body.classList.remove("resofire-sticky-nav");
  });

  // navItems extend: reads settings directly from app().forum.attribute()
  // so it works regardless of whether `this` is an IndexPage or ForumNav instance.
  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var settings=getMenuSettings();
    var menuOrder=settings.menuOrder;
    var menuFlip=settings.menuFlip;
    var customIcons=settings.customIcons;
    var highlighted=settings.highlighted;
    var customLinks=settings.customLinks;

    // Apply highlight color CSS properties — runs here so it works on both
    // IndexPage and the blog's ForumNav (which bypasses IndexPage.oninit).
    applyHighlightColor();

    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){

      // Label/icon discovery — admin only, once per page load, IndexPage only.
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
            if(vnode&&vnode.attrs&&vnode.attrs.icon){
              icons[k]=vnode.attrs.icon;
            }
          }catch(e){}
        });
        var renderedOrder=Object.keys(items.toObject())
          .filter(function(k){return!isTagEntry(k);});
        var body={
          "resofire-menu-control.labels":JSON.stringify(labels),
          "resofire-menu-control.icons":JSON.stringify(icons)
        };
        var existingOrder=app().forum.attribute("menuControlOrder");
        if(!existingOrder&&renderedOrder.length>0){
          body["resofire-menu-control.order"]=JSON.stringify(renderedOrder);
        }
        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:body
        }).catch(function(){});
      }

      // Inject custom links into the ItemList
      if(customLinks&&customLinks.length>0){
        var _LinkButton=flarum.core.compat["common/components/LinkButton"];
        customLinks.forEach(function(link,idx){
          if(!link.url)return;
          var key="custom-link-"+idx;
          if(!items.has(key)){
            var url=link.url;
            // Any absolute URL must be treated as external to avoid Mithril
            // router's pushState() throwing a SecurityError cross-origin.
            var isAbsolute=/^https?:\/\//i.test(url);
            var openInNewTab=!!link.external;
            if(!isAbsolute){
              // Strip base URL so Mithril router handles internal links
              var baseUrl=app().forum.attribute("baseUrl")||"";
              url=url.replace(baseUrl,"");
              if(url==="")url="/";
            }
            var linkAttrs={
              href:url,
              icon:link.icon||"fas fa-link",
              external:isAbsolute
            };
            if(openInNewTab){
              linkAttrs.target="_blank";
              linkAttrs.rel="noopener noreferrer";
            }
            items.add(key,
              m(_LinkButton,linkAttrs,link.label||"Link"),
              0
            );
          }
        });
      }

      // Apply custom icon overrides
      if(customIcons){
        Object.keys(customIcons).forEach(function(key){
          if(items.has(key)){
            try{
              var vnode=items.get(key);
              if(vnode&&vnode.attrs){vnode.attrs.icon=customIcons[key];}
            }catch(e){}
          }
        });
      }

      // Set itemClassName on highlighted items
      if(highlighted&&highlighted.length>0){
        highlighted.forEach(function(key){
          if(items.has(key)){
            try{
              var vnode=items.get(key);
              if(vnode&&vnode.attrs){
                vnode.attrs.itemClassName=(vnode.attrs.itemClassName||"")+" MenuControl-highlighted";
              }
            }catch(e){}
          }
        });
      }

      // Apply saved order
      if(menuOrder&&menuOrder.length>0){
        var base=menuOrder.length+200;
        menuOrder.forEach(function(key,index){
          if(items.has(key)){items.setPriority(key,base-index);}
        });
      }

      // Apply flip
      if(menuFlip){
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
