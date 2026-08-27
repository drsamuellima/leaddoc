import { appUrl } from "@/lib/integrations";

export async function GET() {
  const origin = appUrl();
  const js = `(function(){
  var s=document.currentScript;
  var key=s && s.getAttribute("data-widget-key");
  if(!key) return;
  var iframe=document.createElement("iframe");
  iframe.src=${JSON.stringify(origin)}+"/w/"+encodeURIComponent(key);
  iframe.title="Clinic chat";
  iframe.allow="clipboard-write";
  function closed(){
    iframe.style.cssText="position:fixed;right:12px;bottom:12px;width:80px;height:80px;border:0;z-index:2147483646;background:transparent;color-scheme:normal;";
  }
  function opened(){
    iframe.style.cssText="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483646;background:transparent;color-scheme:normal;";
  }
  closed();
  window.addEventListener("message", function(e){
    if(!e.data || e.data.source!=="dentchat") return;
    if(e.data.type==="open") opened();
    if(e.data.type==="close") closed();
  });
  document.body.appendChild(iframe);
})();`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
