(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

function g(t,o){return g=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,o){return t.__proto__=o,t},g(t,o)}
function _(t,o){t.prototype=Object.create(o.prototype),t.prototype.constructor=t,g(t,o)}

const _app=flarum.core.compat["admin/app"];var app=t.n(_app);
const _Button=flarum.core.compat["common/components/Button"];var Button=t.n(_Button);
const _Switch=flarum.core.compat["common/components/Switch"];var Switch=t.n(_Switch);
const _Stream=flarum.core.compat["common/utils/Stream"];var Stream=t.n(_Stream);
const _ExtensionPage=flarum.core.compat["components/ExtensionPage"];var ExtensionPage=t.n(_ExtensionPage);
const _saveSettings=flarum.core.compat["admin/utils/saveSettings"];var saveSettings=t.n(_saveSettings);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

var MenuControlPage=function(Base){
  function C(){return Base.apply(this,arguments)||this}
  _(C,Base);
  var p=C.prototype;

  p.oninit=function(vnode){
    Base.prototype.oninit.call(this,vnode);
    this.loading=false;
    this.successAlert=null;
    this._labels=app().forum.attribute("menuControlNavLabels")||{};
    this._icons=app().forum.attribute("menuControlIcons")||{};
    this.orderedKeys=this._buildInitialOrder();
    this._savedOrder=this.orderedKeys.slice();

    // Flip toggle
    var rawFlip=app().data.settings["resofire-menu-control.flip"];
    this.flipNav=Stream()(rawFlip==="1"||rawFlip===true);
    this._savedFlip=this.flipNav();

    // Sticky toggle
    var rawSticky=app().data.settings["resofire-menu-control.sticky"];
    this.stickyNav=Stream()(rawSticky==="1"||rawSticky===true);
    this._savedSticky=this.stickyNav();

    // Custom icons — admin-overridden FA class strings per key
    var rawCustomIcons=app().data.settings["resofire-menu-control.custom-icons"];
    var customIconsObj={};
    try{customIconsObj=rawCustomIcons?JSON.parse(rawCustomIcons):{}}catch(e){}
    this.customIcons=Stream()(customIconsObj);
    this._savedCustomIcons=JSON.stringify(customIconsObj);


  };

  p._buildInitialOrder=function(){
    var phpKeys=(app().forum.attribute("menuControlNavKeys")||[])
      .filter(function(k){return!isTagEntry(k);});
    var rawOrder=app().data.settings["resofire-menu-control.order"]||null;
    var savedOrder=[];
    try{savedOrder=rawOrder?JSON.parse(rawOrder):[]}catch(e){}
    savedOrder=savedOrder.filter(function(k){return!isTagEntry(k);});
    var merged=savedOrder.filter(function(k){return phpKeys.indexOf(k)!==-1;});
    phpKeys.forEach(function(k){if(merged.indexOf(k)===-1)merged.push(k);});
    return merged;
  };

  p._label=function(key){return this._labels[key]||key;};
  p._icon=function(key){return this._icons[key]||null;};

  // Returns the custom icon for key if set, otherwise the discovered icon
  p._effectiveIcon=function(key){
    var ci=this.customIcons();
    return (ci[key]&&ci[key].trim()) ? ci[key].trim() : this._icon(key);
  };
  p._setCustomIcon=function(key,val){
    var ci=Object.assign({},this.customIcons());
    if(val&&val.trim()){ci[key]=val.trim();}
    else{delete ci[key];}
    this.customIcons(ci);
    m.redraw();
  };

  p.changed=function(){
    if(this.flipNav()!==this._savedFlip)return true;
    if(this.stickyNav()!==this._savedSticky)return true;
    if(JSON.stringify(this.customIcons())!==this._savedCustomIcons)return true;
    var a=this.orderedKeys,b=this._savedOrder;
    if(a.length!==b.length)return true;
    for(var i=0;i<a.length;i++){if(a[i]!==b[i])return true;}
    return false;
  };

  p.prepareSubmissionData=function(){
    return{
      "resofire-menu-control.order":JSON.stringify(this.orderedKeys),
      "resofire-menu-control.flip":this.flipNav()?"1":"0",
      "resofire-menu-control.sticky":this.stickyNav()?"1":"0",
      "resofire-menu-control.custom-icons":JSON.stringify(this.customIcons())
    };
  };

  p.onsubmit=function(F){
    var self=this;
    F.preventDefault();
    if(this.loading)return;
    this.loading=true;
    app().alerts.dismiss(this.successAlert);
    saveSettings()(this.prepareSubmissionData())
      .then(function(){
        self.successAlert=app().alerts.show(
          {type:"success"},
          app().translator.trans("core.admin.settings.saved_message")
        );
        self._savedOrder=self.orderedKeys.slice();
        self._savedFlip=self.flipNav();
        self._savedSticky=self.stickyNav();
        self._savedCustomIcons=JSON.stringify(self.customIcons());
      })
      .catch(function(){})
      .then(function(){self.loading=false;m.redraw();});
  };

  // ── Render ────────────────────────────────────────────────────────────────
  p.content=function(){
    var self=this;
    var keys=this.orderedKeys;
    return m("div",{className:"MenuControlPage"},
      m("div",{className:"container"},
        m("p",{className:"helpText"},
          app().translator.trans("resofire-menu-control.admin.nav_order.description")),
        m("form",{onsubmit:this.onsubmit.bind(this)},
          m("div",{className:"Form-group"},
            Switch().component({
              state:self.flipNav(),
              onchange:function(val){self.flipNav(val);m.redraw();}
            },app().translator.trans("resofire-menu-control.admin.nav_order.flip_label"))
          ),
          m("p",{className:"helpText",style:"margin-top:-8px;margin-bottom:16px;"},
            app().translator.trans("resofire-menu-control.admin.nav_order.flip_help")),
          m("div",{className:"Form-group"},
            Switch().component({
              state:self.stickyNav(),
              onchange:function(val){self.stickyNav(val);m.redraw();}
            },app().translator.trans("resofire-menu-control.admin.nav_order.sticky_label"))
          ),
          m("p",{className:"helpText",style:"margin-top:-8px;margin-bottom:16px;"},
            app().translator.trans("resofire-menu-control.admin.nav_order.sticky_help")),
          keys.length===0
            ?m("p",{className:"MenuControlPage-empty helpText"},
                app().translator.trans("resofire-menu-control.admin.nav_order.no_items"))
            :m("ul",{className:"MenuControlPage-list"},
                keys.map(function(key,index){return self._renderItem(key,index,keys);})),
          Button().component({
            type:"submit",
            className:"Button Button--primary",
            loading:self.loading,
            disabled:!self.changed()
          },app().translator.trans("resofire-menu-control.admin.nav_order.save_button"))
        )
      )
    );
  };

  p._renderItem=function(key,index,keys){
    var self=this;
    var icon=this._icon(key);

    return m("li",{key:key,className:"MenuControlPage-item"},
      m("span",{className:"MenuControlPage-icon","aria-hidden":"true"},
          self._effectiveIcon(key)
            ?m("i",{className:self._effectiveIcon(key)+" fa-fw"})
            :m("i",{className:"fas fa-question fa-fw",style:"opacity:0.2"})),
      m("span",{className:"MenuControlPage-label"},self._label(key)),
      m("input",{
        className:"FormControl MenuControlPage-iconInput",
        type:"text",
        placeholder:self._icon(key)||"fas fa-...",
        value:self.customIcons()[key]||"",
        title:app().translator.trans("resofire-menu-control.admin.nav_order.icon_input_title"),
        oninput:function(e){self._setCustomIcon(key,e.target.value);},

      }),
      m("span",{className:"MenuControlPage-arrows"},
        Button().component({
          className:"Button Button--icon Button--flat",
          icon:"fas fa-arrow-up",
          title:app().translator.trans("resofire-menu-control.admin.nav_order.move_up"),
          disabled:index===0,
          onclick:function(){self._moveUp(index);}
        }),
        Button().component({
          className:"Button Button--icon Button--flat",
          icon:"fas fa-arrow-down",
          title:app().translator.trans("resofire-menu-control.admin.nav_order.move_down"),
          disabled:index===keys.length-1,
          onclick:function(){self._moveDown(index);}
        })
      )
    );
  };

  p._moveUp=function(index){
    if(index===0)return;
    var arr=this.orderedKeys.slice();
    var tmp=arr[index-1];arr[index-1]=arr[index];arr[index]=tmp;
    this.orderedKeys=arr;m.redraw();
  };
  p._moveDown=function(index){
    if(index===this.orderedKeys.length-1)return;
    var arr=this.orderedKeys.slice();
    var tmp=arr[index];arr[index]=arr[index+1];arr[index+1]=tmp;
    this.orderedKeys=arr;m.redraw();
  };

  return C;
}(ExtensionPage());

app().initializers.add("resofire-menu-control",function(){
  app().extensionData.for("resofire-menu-control").registerPage(MenuControlPage);
});

})(),module.exports=o})();
