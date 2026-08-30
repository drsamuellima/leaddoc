import { resolvePublicOrigin } from "@/lib/integrations";

export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request);
  const js = `(function(){
  var s=document.currentScript;
  var key=s && s.getAttribute("data-widget-key");
  if(!key) return;
  var iframe=document.createElement("iframe");
  iframe.src=${JSON.stringify(origin)}+"/w/"+encodeURIComponent(key);
  iframe.title="Clinic chat";
  iframe.allow="clipboard-write";
  iframe.setAttribute("allowtransparency","true");
  iframe.setAttribute("frameborder","0");
  iframe.setAttribute("scrolling","no");
  var side="right";
  var isOpen=false;
  var probe=null;
  var BASE="position:fixed;right:auto;bottom:auto;max-width:none;max-height:none;border:0;z-index:2147483646;background:transparent;background-color:transparent;color-scheme:normal;pointer-events:auto;overflow:hidden;";

  function applyPos(pos){
    if(pos==="left"||pos==="bottom-left") side="left";
    else if(pos==="right"||pos==="bottom-right") side="right";
  }

  function num(v){ return parseFloat(v)||0; }

  function safeArea(){
    if(!probe){
      probe=document.createElement("div");
      probe.setAttribute("aria-hidden","true");
      probe.style.cssText="position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);";
    }
    if(probe.parentNode!==document.documentElement) document.documentElement.appendChild(probe);
    var cs=window.getComputedStyle(probe);
    return {top:num(cs.paddingTop),right:num(cs.paddingRight),bottom:num(cs.paddingBottom),left:num(cs.paddingLeft)};
  }

  function createsContainingBlock(el){
    if(!el||el.nodeType!==1) return false;
    var st=window.getComputedStyle(el);
    if(!st) return false;
    var t=st.transform,f=st.filter,p=st.perspective,c=st.contain,w=st.willChange||"";
    var bf=st.backdropFilter||st.webkitBackdropFilter||"";
    var tr=st.translate,ro=st.rotate,sc=st.scale,z=st.zoom;
    if(t&&t!=="none") return true;
    if(tr&&tr!=="none") return true;
    if(ro&&ro!=="none") return true;
    if(sc&&sc!=="none") return true;
    if(z&&z!=="normal"&&z!=="1") return true;
    if(f&&f!=="none") return true;
    if(p&&p!=="none") return true;
    if(c&&/(layout|paint|strict|content)/.test(c)) return true;
    if(bf&&bf!=="none") return true;
    if(w&&w!=="auto"&&w!=="none"&&/(transform|perspective|filter|backdrop-filter|contain)/.test(w)) return true;
    return false;
  }

  function findTrap(){
    var el=iframe.parentElement;
    while(el){
      if(createsContainingBlock(el)) return el;
      if(el===document.documentElement) break;
      el=el.parentElement;
    }
    return null;
  }

  function viewport(){
    var vv=window.visualViewport;
    if(vv) return {width:vv.width,height:vv.height,left:vv.offsetLeft,top:vv.offsetTop};
    var de=document.documentElement;
    return {width:window.innerWidth||de.clientWidth,height:window.innerHeight||de.clientHeight,left:0,top:0};
  }

  function mount(){
    var root=document.documentElement;
    var body=document.body;
    var host=root;
    if(body&&createsContainingBlock(root)&&!createsContainingBlock(body)) host=body;
    if(iframe.parentNode!==host) host.appendChild(iframe);
  }

  function place(){
    mount();
    var vp=viewport();
    var safe=safeArea();
    var gap=12;
    var w,h;
    if(isOpen){
      w=Math.min(400,vp.width-16);
      h=Math.min(640,vp.height-16-safe.bottom-safe.top);
    } else {
      w=80;
      h=80;
    }
    var insetL=gap+safe.left;
    var insetR=gap+safe.right;
    var insetB=Math.max(gap,safe.bottom+8);
    var insetT=Math.max(gap,safe.top);
    var maxW=Math.max(isOpen?220:64,vp.width-insetL-insetR);
    var maxH=Math.max(isOpen?240:64,vp.height-insetT-insetB);
    if(w>maxW) w=maxW;
    if(h>maxH) h=maxH;
    var vx=side==="left"?vp.left+insetL:vp.left+vp.width-w-insetR;
    var vy=vp.top+vp.height-h-insetB;
    if(vx<vp.left+insetL) vx=vp.left+insetL;
    if(vy<vp.top+insetT) vy=vp.top+insetT;
    var trap=findTrap();
    var top=vy,left=vx;
    if(trap){
      var r=trap.getBoundingClientRect();
      var st=window.getComputedStyle(trap);
      left=vx-r.left-num(st.borderLeftWidth);
      top=vy-r.top-num(st.borderTopWidth);
    }
    iframe.style.cssText=BASE+"top:"+top+"px;left:"+left+"px;width:"+Math.round(w)+"px;height:"+Math.round(h)+"px;";
  }

  window.addEventListener("resize",place);
  window.addEventListener("scroll",place,true);
  window.addEventListener("orientationchange",place);
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize",place);
    window.visualViewport.addEventListener("scroll",place);
  }
  window.addEventListener("message",function(e){
    if(!e.data||e.data.source!=="dentchat") return;
    if(e.data.position) applyPos(e.data.position);
    if(e.data.type==="open") isOpen=true;
    else if(e.data.type==="close") isOpen=false;
    place();
  });
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",place);
  place();
})();`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
