import{
Color as Lt,Vector2 as et,Vector3 as Ce,TextureLoader as Kn,MathUtils as tt,BufferGeometry as Jn,Float32BufferAttribute as eo,LineBasicMaterial as to,LineSegments as no,PlaneGeometry as fn,Group as mn,ShaderMaterial as pn,DoubleSide as pt,Mesh as Pt,SRGBColorSpace as hn,Scene as oo,PerspectiveCamera as ao,Raycaster as ro,WebGLRenderer as io,NoToneMapping as so,PMREMGenerator as lo,DirectionalLight as Rt,AmbientLight as co,BackSide as uo,SphereGeometry as fo,Box3 as mo,MeshStandardMaterial as po,MeshPhysicalMaterial as ho,Quaternion as vn,DynamicDrawUsage as vo,MeshBasicMaterial as go
}
from"./C64vahhe.js";
import{
R as wo,G as yo
}
from"./CY4PXAcZ.js";
import{
n as gn
}
from"./CqwBXPrO.js";
import{
c as _o
}
from"./CuRmH4_R.js";
import{
g as So,u as Mo,_ as To
}
from"./tCp9GxJk.js";
import{
_ as Rn,i as at,u as it,o as Dn,b as bo,c as rt,g as It,s as Fe,r as te,t as xo,v as Eo,x as wn,y as Co,l as Lo,e as B,z as We,j as ce,d as yn,F as Po,A as Ro,m as Dt,w as nt,B as Do,C as _n,h as q,D as Bo,E as Sn
}
from"./BAt6UgCr.js";
import{
_ as Io
}
from"./BlGwIGv3.js";
import{
u as Ao,r as Oo
}
from"./tMZp3E3_.js";
import{
p as Mn
}
from"./B0x6C0cN.js";
const Bt=new Map;
function Ho($,y={

}
){
const I=y?.timeoutMs??4500,Se=!!y?.highPriority;
if(!$)return Promise.resolve(!1);
if(Bt.has($))return Bt.get($);
const H=new Promise(C=>{
const f=new Image;
let d=!1;
const U=b=>{
d||(d=!0,C(b))
}
,M=window.setTimeout(()=>U(!1),I),ue=()=>{
if(typeof f.decode=="function"){
f.decode().then(()=>{
clearTimeout(M),U(!0)
}
).catch(()=>{
clearTimeout(M),U(!0)
}
);
return
}
clearTimeout(M),U(!0)
}
;
f.onload=ue,f.onerror=()=>{
clearTimeout(M),U(!1)
}
,f.decoding="async","fetchPriority"in f&&(f.fetchPriority=Se?"high":"low"),f.src=$,f.complete&&f.naturalWidth>0&&ue()
}
);
return Bt.set($,H),H
}
function Bn($,y={

}
){
const I=[...new Set(($??[]).filter(Boolean))];
if(!I.length)return Promise.resolve([]);
const Se=Math.max(1,Math.min(y?.concurrency??4,I.length)),H=Math.max(0,y?.highPriorityCount??0);
let C=0;
const f=Array.from({
length:Se
}
,async()=>{
for(;
C<I.length;
){
const d=C;
C+=1,await Ho(I[d],{
timeoutMs:y?.timeoutMs,highPriority:d<H
}
)
}

}
);
return Promise.allSettled(f)
}
const Tn=`
  vec3 linearToSRGB(vec3 c) {
 return pow(max(c, 0.0), vec3(1.0 / 2.2));
 
}

`,Uo=`
  varying vec3 vWorldPos;

  void main() {

    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;

  
}

`,Wo=`
  uniform float uBendH;
   // horizontal arch driven by spin velocity
  uniform float uBendV;
   // vertical arch driven by scroll velocity
  uniform float uTime;

  uniform float uPhase;
   // per-panel random phase for idle wave
  varying vec2  vUv;

  varying float vViewZ;


  void main() {

    vUv = uv;

    vec3 pos = position;


    // UV-space coords centred on 0
    float xn = (uv.x - 0.5) * 2.0;
   // -1 … +1
    float yn = (uv.y - 0.5) * 2.0;


    // Parabolic arch: 1 at centre, 0 at both edges
    float archX = 1.0 - xn * xn;

    float archY = 1.0 - yn * yn;


    pos.z -= archX * uBendH;
   // horizontal arch (spin)
    pos.z -= archY * uBendV;
   // vertical arch  (scroll)

    // Subtle idle wave — each panel has a different phase
    pos.z += sin(uv.y * 6.283 + uTime * 0.55 + uPhase)
           * sin(uv.x * 3.14  + uTime * 0.35 + uPhase * 1.3) * 0.016;


    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    vViewZ = -mvPos.z;

    gl_Position = projectionMatrix * mvPos;

  
}

`,ke=.35,ht=12,ot=5,ko=1.2,Fo=.85,No=.72,bn=.25,xn=.15,jo=.36,zo=5e-4,Vo=.22,En=1376481,Go=10,Cn=.008,Ln=.007,V=1.1,Yo=.72,Xo=1.26,qo=.88,Pn=0,$o=760,Zo=840,Qo=980,Ko=1600,Jo=12,ea=850,ta=4,na={
__name:"ThreeCylinderScene",props:{
projects:{
type:Array,default:()=>[]
}
,spiral:{
type:Boolean,default:!1
}

}
,emits:["hover-project","open-project","focus-state-change"],setup($,{
expose:y,emit:I
}
){
let Se=null;
function H(){
return Se??=So()
}
const C=$,f=I;
at(()=>C.projects,e=>{
e?.length&&p&&(M.value=!1,xt())
}
,{
deep:!1
}
),at(()=>C.spiral,e=>{
J=e?1:0
}
);
const d=window.matchMedia("(hover: none)").matches,U=te(null),M=te(!1),ue=it("transition",()=>null),b=te(!1),Ne=te(!0),vt=`
  uniform vec3 uBaseColor;

  uniform float uSideDarken;

  uniform float uCenterLift;

  uniform float uOpacity;

  varying vec3 vWorldPos;


  ${
Tn
}


  void main() {

    vec3 dir = normalize(vWorldPos - cameraPosition);

    float side = smoothstep(0.18, 0.95, abs(dir.x));

    float lift = 1.0 + (1.0 - side) * uCenterLift;


    vec3 centerCol = uBaseColor * lift;

    vec3 sideCol   = uBaseColor * (1.0 - uSideDarken);

    vec3 col       = mix(centerCol, sideCol, side);


    gl_FragColor = vec4(linearToSRGB(col), uOpacity);

  
}

`,Me=`
  uniform sampler2D uTexture;

  uniform float     uOpacity;

  uniform float     uBlur;

  uniform float     uDepthNear;

  uniform float     uDepthFar;

  uniform vec3      uDepthColor;

  uniform float     uDepthStrength;

  varying vec2      vUv;

  varying float     vViewZ;


  ${
Tn
}


  // 9-tap box blur in UV space — cheap fake "soft" sampling for the entrance.
  vec4 sampleBlurred(sampler2D tex, vec2 uv, float blur) {

    if (blur <= 0.0005) return texture2D(tex, uv);

    vec4 acc  = texture2D(tex, uv) * 0.25;

    acc      += texture2D(tex, uv + vec2( blur, 0.0))   * 0.125;

    acc      += texture2D(tex, uv + vec2(-blur, 0.0))   * 0.125;

    acc      += texture2D(tex, uv + vec2(0.0,   blur))  * 0.125;

    acc      += texture2D(tex, uv + vec2(0.0,  -blur))  * 0.125;

    acc      += texture2D(tex, uv + vec2( blur,  blur)) * 0.0625;

    acc      += texture2D(tex, uv + vec2(-blur,  blur)) * 0.0625;

    acc      += texture2D(tex, uv + vec2( blur, -blur)) * 0.0625;

    acc      += texture2D(tex, uv + vec2(-blur, -blur)) * 0.0625;

    return acc;

  
}


  void main() {

    vec4 col = sampleBlurred(uTexture, vUv, uBlur);

    float depthT = smoothstep(uDepthNear, uDepthFar, vViewZ);

    float luma   = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));

    vec3  toned  = mix(col.rgb, vec3(luma), depthT * 0.12);

    toned        = mix(toned, uDepthColor, depthT * uDepthStrength);

    col.rgb      = linearToSRGB(toned);

    col.a    *= uOpacity;

    gl_FragColor = col;

  
}

`,je=new Lt(En);
let x,p,g,Z,Q=null,G=null,ne=null,E=null,oe=null,ae=null,de=new et,Le=0,Y=[],T=[],_=null,K=7,fe=0,J=0,ee=0,st=!1,Pe=7,ze=1,Re=0,De=0,L=0,Te=0,re=1,W=1,k=!1,X=!1,me=null,P=null,ie=new et(.5,.5),pe=new et(.5,.5),he=0,Ve=0,Be=0,Ge=0,o=!1,l=null,w=!1,F=0,be=0,Ie=0,R=0,Ae=!1,gt=null,wt=0,Oe=null,Ye=[],lt=null,ct=null;
const At=new et,Ot=new et;
let N="grid",j=0,z=1,D=null,Xe=null,Ht=1.4,Ut=1.9,qe=0;
const $e=new Ce,yt=new vn,_t=new Ce,Wt=new Ce,kt=new vn,Ft=new Ce;
let xe=[],ve=0,ge=1,we=!1,Nt=0,A=!1,jt=!1;
const zt=it("appBootContentReveal",()=>!1);
let He=null,Ze=null,Qe=null;
function ut(e,t,n){
return e>=n.left&&e<=n.right&&t>=n.top&&t<=n.bottom
}
function St(){
return document.documentElement.classList.contains("mobile-menu-open")
}
function Ke(e,t){
if(St())return!0;
if(ct||(ct=document.querySelector(".nav")),ct instanceof HTMLElement){
const s=ct.getBoundingClientRect();
if(ut(e,t,s))return!0
}
const n=document.querySelector(".nav__mobile-overlay");
if(n instanceof HTMLElement){
const s=n.getBoundingClientRect();
if(ut(e,t,s))return!0
}
const a=document.querySelector(".layout-switch");
if(a instanceof HTMLElement){
const s=a.getBoundingClientRect();
if(ut(e,t,s))return!0
}
const r=document.documentElement.classList;
if(r.contains("show--consent")||r.contains("show--preferences")){
const s=document.querySelector("#cc-main .cm, #cc-main .pm");
if(s instanceof HTMLElement){
const i=s.getBoundingClientRect();
if(ut(e,t,i))return!0
}

}
return!1
}
function In(){
return d||!H().highEndRosa?new po({
color:10003126,roughness:.16,metalness:1,envMap:ne,envMapIntensity:1.8,side:pt
}
):new ho({
color:10003384,roughness:.042,metalness:1,envMap:ne,envMapIntensity:2.35,clearcoat:.95,clearcoatRoughness:.022,ior:2.333,reflectivity:1,side:pt
}
)
}
const Je=new Map,Mt=new Map,Vt=new Kn;
Vt.crossOrigin="anonymous";
function Tt(){
requestAnimationFrame(()=>{
M.value=b.value&&Ne.value
}
)
}
function dt(e){
if(Ne.value=!e,e){
M.value=!1;
return
}
Tt()
}
function Gt(e){
const t=gn(e);
if(!t)return{
texture:null,ready:Promise.resolve()
}
;
if(Je.has(t))return{
texture:Je.get(t),ready:Mt.get(t)??Promise.resolve()
}
;
let n;
const a=new Promise(s=>{
n=s
}
);
Mt.set(t,a);
const r=Vt.load(t,()=>n(),void 0,()=>n());
return r.colorSpace=hn,Je.set(t,r),{
texture:r,ready:a
}

}
function An(e){
return Gt(e).texture
}
function Yt(e){
return d&&e.imageSmall||e.image
}
let O=null,ye=null;
function Xt(){
O&&(p.remove(O),O.geometry.dispose(),O=null);
const e=window.innerWidth,n=window.innerHeight/Math.max(e,1),a=n>1,r=30,s=a?Math.max(30,22*Math.min(n,2.2)):22,i=200,c=80,m=a?22:16,v=[];
for(let h=0;
h<c;
h++){
const se=h/c*Math.PI*2,le=Math.cos(se)*r,Ee=Math.sin(se)*r;
v.push(le,-s,Ee,le,s,Ee)
}
for(let h=0;
h<=m;
h++){
const se=-s+h/m*s*2;
for(let le=0;
le<i;
le++){
const Ee=le/i*Math.PI*2,Ue=(le+1)/i*Math.PI*2;
v.push(Math.cos(Ee)*r,se,Math.sin(Ee)*r,Math.cos(Ue)*r,se,Math.sin(Ue)*r)
}

}
const S=new Jn;
S.setAttribute("position",new eo(v,3));
const u=A?ke:0;
ye?ye.opacity=u:ye=new to({
color:0,transparent:!0,opacity:u,depthWrite:!1
}
),O=new no(S,ye),O.renderOrder=-10,p.add(O)
}
function ft(e){
ye&&(ye.opacity=e)
}
function qt(e){
oe?.uniforms?.uOpacity&&(oe.uniforms.uOpacity.value=e)
}
function On(){
E&&(p.remove(E),E.geometry.dispose(),E=null),oe?.dispose();
const e=new Lt(En).convertSRGBToLinear();
oe=new pn({
uniforms:{
uBaseColor:{
value:e
}
,uSideDarken:{
value:.38
}
,uCenterLift:{
value:.06
}
,uOpacity:{
value:1
}

}
,vertexShader:Uo,fragmentShader:vt,side:uo,depthTest:!0,depthWrite:!1,transparent:!0,toneMapped:!1
}
),E=new Pt(new fo(140,28,20),oe),E.renderOrder=-100,p.add(E)
}
function mt(){
const e=window.innerWidth,n=window.innerHeight>e;
return e<768&&!n?{
fov:50,cameraZ:13,radius:7.8,panelW:1.4*V,panelH:1.9*V,rowSpacing:7
}
:e<500?{
fov:70,cameraZ:7.5,radius:4.5,panelW:1*V,panelH:1.4*V,rowSpacing:5.5
}
:e<768?{
fov:70,cameraZ:9.5,radius:4.6,panelW:1*V,panelH:1.4*V,rowSpacing:3.8
}
:e<1024&&n?{
fov:65,cameraZ:9,radius:5.5,panelW:1*V,panelH:1.4*V,rowSpacing:6.5
}
:e<1024?{
fov:60,cameraZ:11,radius:6.5,panelW:1.2*V,panelH:1.6*V,rowSpacing:4
}
:{
fov:50,cameraZ:13,radius:7.8,panelW:1.4*V,panelH:1.9*V,rowSpacing:7
}

}
function Hn(){
const e=window.innerWidth,t=window.innerHeight;
return e<768&&e>t?6.5:e<500?3.5:e<768?4:e<1024?4.5:6.5
}
function $t(){
if(!_||!lt)return;
const e=Hn()/lt;
_.scale.set(e,e,e)
}
function Zt(){
const e=d?Math.min(1.5,H().maxPixelRatio):H().maxPixelRatio;
return Math.min(window.devicePixelRatio,e)
}
function Qt(){
const e=mt();
K=e.rowSpacing,p=new oo,g=new ao(e.fov,window.innerWidth/window.innerHeight,.1,1e3),g.position.z=e.cameraZ,ae=new ro,x=new io({
canvas:U.value,antialias:!d&&H().antialias,alpha:!0
}
),x.setClearColor(je,1),x.setSize(window.innerWidth,window.innerHeight,!1),x.setPixelRatio(Zt()),x.outputColorSpace=hn,x.toneMapping=so,Q=new lo(x);
const t=new wo;
G=Q.fromScene(t,.04),ne=G.texture,p.environment=ne;
const n=new Rt(11192575,2);
n.position.set(-5,4,6),p.add(n);
const a=new Rt(16761482,1.3);
a.position.set(6,1,-4),p.add(a);
const r=new Rt(16777215,1.1);
r.position.set(0,6,3),p.add(r),p.add(new co(16777215,.2)),On(),Xt(),xt(),d?Qe=window.setTimeout(()=>{
Qe=null,p&&Jt()
}
,1400):Jt(),Le=performance.now(),Ct()
}
function Un(){
if(!d){
Qt();
return
}
const e=()=>{
Ze=window.setTimeout(()=>{
Ze=null,Qt()
}
,900)
}
;
if(typeof window.requestIdleCallback=="function"){
window.requestIdleCallback(e,{
timeout:3e3
}
);
return
}
e()
}
let bt=[];
function Wn(){
bt.length!==ot&&(bt=Array.from({
length:ot
}
,()=>Math.random()*4294967295>>>0))
}
function kn(e){
let t=e>>>0;
return()=>{
t=t+1831565813>>>0;
let n=t;
return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296
}

}
function Fn(e,t){
const n=[...e],a=kn(t);
for(let r=n.length-1;
r>0;
r--){
const s=Math.floor(a()*(r+1));
[n[r],n[s]]=[n[s],n[r]]
}
return n
}
function Nn(){
const e=C.projects;
if(!e||e.length===0)return;
Y.length&&(Y.forEach(c=>{
c.children.forEach(m=>m.material.dispose()),p.remove(c)
}
),Y=[]),T=[],Oe?.dispose(),Oe=null,Wn();
const t=mt();
K=t.rowSpacing,fe=0;
const n=t.cameraZ*.58,a=t.cameraZ*1.85,r=new Lt(2766408).convertSRGBToLinear();
Oe=new fn(t.panelW,t.panelH,12,8);
const s=A?1:0,i=A?0:Pn;
for(let c=0;
c<ot;
c++){
const m=new mn,v=Fn(e,bt[c]);
for(let S=0;
S<ht;
S++){
const u=v[S%v.length],h=(S+c*.5)/ht*Math.PI*2,se=S/ht*Math.PI*2,le=(S/ht-.5)*t.rowSpacing,Ee=new pn({
uniforms:{
uTexture:{
value:An(Yt(u))
}
,uBendH:{
value:0
}
,uBendV:{
value:0
}
,uTime:{
value:0
}
,uPhase:{
value:Math.random()*Math.PI*2
}
,uOpacity:{
value:s
}
,uBlur:{
value:i
}
,uDepthNear:{
value:n
}
,uDepthFar:{
value:a
}
,uDepthColor:{
value:r
}
,uDepthStrength:{
value:.22
}

}
,vertexShader:Wo,fragmentShader:Me,side:pt,transparent:!A,depthWrite:A,toneMapped:!1
}
),Ue=new Pt(Oe,Ee);
Ue.frustumCulled=!1,Ue.userData={
...u,thetaRing:h,thetaSpiral:se,ySpiral:le,targetScale:new Ce(1,1,1),entranceDelay:Zo+Math.random()*Qo,entranceDone:A
}
,m.add(Ue)
}
m.position.y=c*t.rowSpacing-(ot-1)*t.rowSpacing/2,Y.push(m),p.add(m)
}
T=Y.flatMap(c=>c.children),Pe=t.radius,J=C.spiral?1:0,st||(ee=J,st=!0),Kt(ee),T.forEach(c=>c.scale.setScalar(ze))
}
function Kt(e){
const t=Pe*(1+(Yo-1)*e);
ze=1+((d&&window.innerWidth<768&&window.innerHeight>window.innerWidth?qo:Xo)-1)*e;
for(const a of T){
const r=a.userData,s=r.thetaRing+(r.thetaSpiral-r.thetaRing)*e;
a.position.x=Math.cos(s)*t,a.position.z=Math.sin(s)*t,a.position.y=r.ySpiral*e,a.rotation.y=-(s-Math.PI/2)
}

}
async function jn(e){
const t=[...new Set(e.map(c=>gn(Yt(c))).filter(Boolean))];
if(!t.length)return;
const n=Math.min(d?ta:Jo,t.length),a=d?ea:Ko;
Bn(t,{
concurrency:d?2:4,highPriorityCount:n,timeoutMs:4500
}
);
const s=t.slice(0,n).map(c=>Gt(c).ready.catch(()=>{

}
)),i=new Promise(c=>setTimeout(c,a));
await Promise.race([Promise.allSettled(s),i])
}
async function xt(){
const e=++wt;
b.value=!1,M.value=!1;
const t=C.projects;
if(!t?.length)return;
const n=jn(t);
Nn(),await n,e===wt&&(b.value=!0,Tt())
}
function Jt(){
new yo().load("/3d/rosa.glb",t=>{
const n=t.scene,a=In();
a.transparent=!0,a.depthWrite=!0,a.opacity=0,a.needsUpdate=!0,Ye=[],n.traverse(v=>{
v.isMesh&&(v.material=a,Ye.push(v))
}
);
const r=new mo().setFromObject(n),s=r.getSize(new Ce),i=r.getCenter(new Ce);
lt=Math.max(s.x,s.y,s.z),n.position.set(-i.x,-i.y,-i.z),n.rotation.z=-.2;
const m=new mn;
m.add(n),_=m,ge=0,ve=jt?1:0,$t(),p.add(_)
}
,void 0,t=>{
console.warn("[CylinderScene] Failed to load /3d/rosa.glb",t)
}
)
}
function en(e){
return e<.5?2*e*e:-1+(4-2*e)*e
}
function tn(e){
return e<.3?e/.3:e>.7?1-(e-.7)/.3:1
}
function zn(e,t,n){
if(e.userData?._sailCoeff)return e.userData._sailCoeff;
const a=e.attributes.position,r=t/2,s=n/2,i=new Float32Array(a.count);
for(let c=0;
c<a.count;
c++){
const m=a.getX(c)/r,v=a.getY(c)/s,S=Math.min(1,Math.max(0,(m+1)*.5)),u=S*S*(3-2*S),h=.68+.32*(1-v*v);
i[c]=u*h*t*jo
}
return e.userData._sailCoeff=i,i
}
function Vn(e,t,n,a){
const r=e.userData?._lastSail??-1;
if(Math.abs(t-r)<=zo)return;
e.userData._lastSail=t;
const s=zn(e,n,a),i=e.attributes.position,c=i.array;
for(let m=0;
m<i.count;
m++)c[m*3+2]=s[m]*t;
i.needsUpdate=!0
}
function Et(e,t){
const n=t<1;
e.uniforms?.uOpacity!==void 0?e.uniforms.uOpacity.value=t:e.opacity=t,e.transparent=n,e.depthWrite=!n
}
function Gn(e){
const t=mt();
Ht=t.panelW,Ut=t.panelH,e.getWorldPosition($e),e.getWorldQuaternion(yt),e.getWorldScale(_t);
const n=1.5,a=t.cameraZ-n,s=2*Math.tan(g.fov*Math.PI/180/2)*a*g.aspect,i=window.innerWidth,m=(i<768?i-60:i<1024?i*.45:i*.3)*(s/i)/t.panelW;
Wt.set(0,0,n),kt.identity(),Ft.setScalar(m),qe=tt.clamp($e.z/Math.max(t.radius,.001),0,1),$e.x>=0;
const v=new fn(t.panelW,t.panelH,40,20);
v.attributes.position.setUsage(vo);
const S=e.material.uniforms?.uTexture?.value??e.material.map??null,u=new go({
map:S,transparent:!0,opacity:1,side:pt,toneMapped:!1
}
);
D=new Pt(v,u),D.position.copy($e),D.quaternion.copy(yt),D.scale.copy(_t),p.add(D),e.visible=!1,ve=-1,Xe=e,xe=T.filter(h=>h!==e),xe.forEach(h=>{
Et(h.material,1),h.material.transparent=!0
}
),xe=xe.map(h=>({
mesh:h,mat:h.material
}
)),k=!1,W=1,N="focus",j=0,z=1,f("focus-state-change","focus")
}
function Yn(){
N==="opening"&&(N="focus",z=-1,f("focus-state-change","back"))
}
function Xn(e){
if(ve!==0&&_){
ge=Math.max(0,Math.min(1,ge+ve*e/No));
for(const i of Ye)i.material.transparent=!0,i.material.depthWrite=!0,i.material.opacity=ge;
if((!A||we)&&ft(ke*ge),ge<=0&&(_.visible=!1,ve=0),ge>=1){
for(const i of Ye)i.material.transparent=!1,i.material.depthWrite=!0,i.material.needsUpdate=!0;
(!A||we)&&ft(ke),ve=0
}

}
if(N==="grid")return;
const t=z===1?ko:Fo;
j=Math.max(0,Math.min(1,j+z*e/t));
const n=en(j),a=tn(z===1?j:1-j);
D.position.lerpVectors($e,Wt,n),D.quaternion.slerpQuaternions(yt,kt,n),D.scale.lerpVectors(_t,Ft,n),z===1&&qe>.001&&(D.position.z+=qe*Vo*Math.sin(j*Math.PI*.9));
const r=z===1?Math.max(a,qe*Math.sin(j*Math.PI)*.9):a;
Vn(D.geometry,r,Ht,Ut);
const s=en(Math.min(j/.5,1));
xe.forEach(({
mat:i
}
)=>{
Et(i,z===1?1-s:s)
}
),ft(z===1?ke*(1-s):ke*s),qt(z===1?1-s:s),z===1&&j>=1&&N==="focus"&&(N="opening",f("open-project",{
...Xe.userData
}
),f("focus-state-change","opening")),z===-1&&j<=0&&qn()
}
function qn(){
p.remove(D),D.geometry.dispose(),D.material.dispose(),D=null,Xe&&(Xe.visible=!0,Xe=null),_&&(_.visible=!0,ve=1),xe.forEach(({
mat:e
}
)=>{
Et(e,1)
}
),xe=[],ft(ke),qt(1),N="grid",j=0,qe=0,f("focus-state-change","grid")
}
function $n(){
if(!we)return;
const e=performance.now()-Nt;
let t=!0;
for(const n of T){
if(n.userData.entranceDone)continue;
const a=e-n.userData.entranceDelay;
if(a<=0){
t=!1;
continue
}
const r=Math.min(1,a/$o),s=1-Math.pow(1-r,3),i=n.material;
i.uniforms?.uOpacity&&(i.uniforms.uOpacity.value=s),i.uniforms?.uBlur&&(i.uniforms.uBlur.value=Pn*(1-s)),r>=1?(n.userData.entranceDone=!0,i.uniforms?.uOpacity&&(i.uniforms.uOpacity.value=1),i.uniforms?.uBlur&&(i.uniforms.uBlur.value=0),i.transparent=!1,i.depthWrite=!0):t=!1
}
t&&(we=!1)
}
function Zn(){
A||zt.value&&b.value&&T.length&&(k=!1,A=!0,we=!0,Nt=performance.now(),_?(ge=0,ve=1):jt=!0)
}
at([zt,b],()=>Zn(),{
flush:"post"
}
);
let _e=null;
at(b,e=>{
_e!==null&&(clearTimeout(_e),_e=null),e&&(_e=window.setTimeout(()=>{
_e=null,!(M.value||!b.value)&&(ue.value?.isRunning||(Ne.value=!0,Tt()))
}
,2200))
}
);
function Ct(){
Z=requestAnimationFrame(Ct);
const e=performance.now(),t=Math.min((e-Le)/1e3,.05);
if(Le=e,$n(),Ve+=t,N==="grid"){
re+=(W-re)*.1;
const n=t*re;
Math.abs(J-ee)>1e-4&&(ee+=(J-ee)*(1-Math.exp(-3.2*t)),Math.abs(J-ee)<=1e-4&&(ee=J),Kt(ee)),De+=(Re-De)*.1;
const a=De-fe;
fe=De,L*=Math.pow(.92,n*60),Te+=(.08+L)*n,Be+=(tt.clamp(L*.1,-bn,bn)-Be)*.08,Ge+=(tt.clamp(a*8,-xn,xn)-Ge)*.12;
const r=ot*K;
Y.forEach(u=>{
u.position.y-=a,u.position.y>r/2+K&&(u.position.y-=r),u.position.y<-r/2-K&&(u.position.y+=r),u.rotation.y=Te
}
),O&&(O.rotation.y=Te*.09),_&&(_.rotation.y=-Te*2);
const s=w||St(),i=A&&!we;
let c=[];
!X&&!s&&i&&(ae.setFromCamera(de,g),c=ae.intersectObjects(T,!1));
const m=c.length?c[0].object:null,v=c.length&&c[0].uv?c[0].uv:null,S=1-Math.exp(-8*t);
if(T.forEach(u=>{
const h=!d&&m===u?1.08:1;
u.userData.targetScale.setScalar(ze*h),u.scale.distanceToSquared(u.userData.targetScale)>1e-5&&u.scale.lerp(u.userData.targetScale,S),u.material.uniforms?.uBendH!==void 0&&(u.material.uniforms.uBendH.value=Be,u.material.uniforms.uBendV.value=Ge,u.material.uniforms.uTime.value=Ve)
}
),m){
if(k||(k=!0,d||(W=.3),f("hover-project",m.userData),document.dispatchEvent(new CustomEvent("mesh-hover",{
detail:!0
}
))),!d&&v&&P){
if(o){
const u=v.x-pe.x,h=v.y-pe.y,se=Math.sqrt(u*u+h*h)*30;
he+=(Math.min(se,1)-he)*.15,pe.copy(v),ie.copy(v)
}
else he+=(0-he)*.08;
P.uniforms.uMouse.value.copy(ie),P.uniforms.uTime.value=Ve,P.uniforms.uVelocity.value=he
}

}
else k&&(k=!1,W=1,f("hover-project",null),document.dispatchEvent(new CustomEvent("mesh-hover",{
detail:!1
}
)),he=0)
}
Xn(t),x.render(p,g)
}
function nn(e){
w=Ke(e.clientX,e.clientY),de.x=e.clientX/window.innerWidth*2-1,de.y=e.clientY/window.innerHeight*-2+1,ie.set(tt.clamp(e.clientX/window.innerWidth,0,1),tt.clamp(1-e.clientY/window.innerHeight,0,1)),o=!0,clearTimeout(l),l=setTimeout(()=>{
o=!1
}
,120)
}
function on(){
X=!0,clearTimeout(me),me=setTimeout(()=>{
X=!1
}
,200)
}
function an(e){
St()||(Re-=e.deltaY*.005,L+=e.deltaY*.004,L=Math.max(-2,Math.min(2,L)),on())
}
function rn(e){
if(d||N!=="grid"||!A||we||Ke(e.clientX,e.clientY))return;
At.set(e.clientX/window.innerWidth*2-1,e.clientY/window.innerHeight*-2+1),ae.setFromCamera(At,g);
const t=ae.intersectObjects(T,!1);
t.length&&Gn(t[0].object)
}
function sn(e){
if(N!=="grid")return;
const t=e.touches[0];
!t||Ke(t.clientX,t.clientY)||(F=t.clientY,Ie=t.clientX,be=t.clientY,R=0,Ae=!1)
}
function ln(e){
if(N!=="grid")return;
const t=e.touches[0];
if(!t||Ke(t.clientX,t.clientY))return;
e.preventDefault();
const n=be-t.clientY;
R=n,Ae||Math.abs(t.clientY-F)+Math.abs(t.clientX-Ie)>Go&&(Ae=!0),Re-=n*Cn,L+=n*Ln,L=Math.max(-2,Math.min(2,L)),on(),be=t.clientY
}
function cn(e){
if(N!=="grid"||!A||we)return;
const t=e.changedTouches?.[0];
if(t&&!Ke(t.clientX,t.clientY)){
if(!Ae){
Ot.set(t.clientX/window.innerWidth*2-1,t.clientY/window.innerHeight*-2+1),ae.setFromCamera(Ot,g);
const n=ae.intersectObjects(T,!1);
n.length&&f("open-project",{
...n[0].object.userData
}
);
return
}
Re-=R*Cn*3.5,L+=R*Ln*3.5,L=Math.max(-2,Math.min(2,L))
}

}
function un(){
document.hidden?Z&&(cancelAnimationFrame(Z),Z=null):!Z&&x&&(Le=performance.now(),Ct())
}
function dn(){
const e=mt();
g.fov=e.fov,g.position.z=e.cameraZ,g.aspect=window.innerWidth/window.innerHeight,g.updateProjectionMatrix(),x.setSize(window.innerWidth,window.innerHeight,!1),x.setPixelRatio(Zt()),x.setClearColor(je,1),clearTimeout(gt),gt=setTimeout(()=>{
Xt(),xt(),$t()
}
,200)
}
function Qn(){
wt+=1,b.value=!1,M.value=!1,Oe?.dispose(),Oe=null,Y.forEach(e=>{
e.children.forEach(t=>t.material.dispose()),p.remove(e)
}
),Y=[],T=[],Ye=[],Je.forEach(e=>e.dispose()),Je.clear(),Mt.clear(),O&&(p.remove(O),O.geometry.dispose(),O=null),ye?.dispose(),ye=null,E&&(p.remove(E),E.geometry.dispose(),E=null),oe?.dispose(),oe=null,_&&(_.traverse(e=>{
e.isMesh&&(e.geometry?.dispose(),e.material?.dispose())
}
),p.remove(_),_=null),lt=null,G?.dispose(),G=null,Q?.dispose(),Q=null,ne=null,x?.dispose()
}
return Dn(()=>{
dt(!!ue.value?.isRunning),He=_o(()=>{
Un()
}
,{
transitionState:ue,extraBlocker:()=>document.documentElement.getAttribute("data-boot")==="1",delayMs:d?700:60
}
),He.run();
const e=()=>dt(!0),t=()=>dt(!1),n=()=>{
dt(!1),He?.run()
}
,a=()=>{
He?.run()
}
,r=()=>{
He?.run()
}
;
document.addEventListener("page:out-start",e),document.addEventListener("page:reveal",t),document.addEventListener("page:transition:end",n),document.addEventListener("app:boot:patch-opened",a),document.addEventListener("app:loading:end",r),document.addEventListener("visibilitychange",un),window.addEventListener("wheel",an,{
passive:!0
}
),window.addEventListener("resize",dn),window.addEventListener("mousemove",nn),window.addEventListener("click",rn),window.addEventListener("touchstart",sn,{
passive:!0
}
),window.addEventListener("touchmove",ln,{
passive:!1
}
),window.addEventListener("touchend",cn,{
passive:!0
}
),bo(()=>{
document.removeEventListener("page:out-start",e),document.removeEventListener("page:reveal",t),document.removeEventListener("page:transition:end",n),document.removeEventListener("app:boot:patch-opened",a),document.removeEventListener("app:loading:end",r),document.removeEventListener("visibilitychange",un),window.removeEventListener("wheel",an),window.removeEventListener("resize",dn),window.removeEventListener("mousemove",nn),window.removeEventListener("click",rn),window.removeEventListener("touchstart",sn),window.removeEventListener("touchmove",ln),window.removeEventListener("touchend",cn),cancelAnimationFrame(Z),Ze!==null&&(clearTimeout(Ze),Ze=null),Qe!==null&&(clearTimeout(Qe),Qe=null),clearTimeout(l),clearTimeout(me),clearTimeout(gt),_e!==null&&(clearTimeout(_e),_e=null),He?.cancel(),Qn()
}
)
}
),y({
backToGrid:Yn
}
),(e,t)=>(rt(),It("canvas",{
ref_key:"canvas",ref:U,class:Fe(["webgl",{
"is-revealed":M.value
}
])
}
,null,2))
}

}
,oa=Rn(na,[["__scopeId","data-v-63b5e305"]]),aa={
class:"home-h1"
}
,ra={
class:"home-seo","aria-hidden":"true","data-nosnippet":""
}
,ia=["src","alt"],sa={
class:"home-footer__item"
}
,la={
class:"home-footer__line"
}
,ca={
class:"home-footer__item home-footer__center"
}
,ua={
class:"home-footer__sel"
}
,da={
class:"home-footer__item"
}
,fa={
class:"home-footer__line"
}
,ma="https://pub-9ea8cedb4c66409db918ceb74fd28b5a.r2.dev",pa={
__name:"index",async setup($){
let y,I;
const Se=new Date().getFullYear(),H=Do(),{
public:C
}
=H,f=String(H.public.strapiUrl||"").replace(/\/$/,""),{
locale:d,t:U
}
=xo(),M=Eo(),ue=o=>o?o.replace(ma,C.r2Url):"",b=o=>o?ue(o.startsWith("http")?o:`${
C.strapiUrl
}
${
o
}
`):"";
function Ne(o){
const l=b(o?.url);
if(!l)return{
image:"",imageSmall:""
}
;
const w=o?.formats??{

}
,F=b(w.large?.url),be=b(w.medium?.url),Ie=b(w.small?.url);
return{
image:F||l,imageSmall:Ie||be||F||l
}

}
const{
data:vt
}
=([y,I]=wn(async()=>_n(`projects-home-${
d.value
}
`,async()=>{
if(!f)return[];
try{
return((await $fetch(`${
f
}
/api/projects`,{
params:{
"populate[cover][fields][0]":"url","populate[cover][fields][1]":"formats","populate[categories][fields][0]":"name","populate[categories][fields][1]":"slug","sort[0]":"order:asc","fields[0]":"title","fields[1]":"slug","fields[2]":"order","fields[3]":"year","fields[4]":"title_short",locale:d.value
}

}
)).data??[]).map(l=>({
id:l.id,title:l.title??"",title_short:l.title_short??"",slug:l.slug??"",year:l.year??"",...Ne(l.cover),category:l.categories?.[0]?.name??"",categories:(l.categories??[]).map(w=>({
name:w.name??"",slug:w.slug??""
}
))
}
)).filter(l=>l.image)
}
catch(o){
return console.warn("[index] Strapi error:",o?.message),[]
}

}
,{
getCachedData:Mn
}
)),y=await y,I(),y),Me=q(()=>vt.value??[]),{
data:je
}
=([y,I]=wn(async()=>_n(`global-seo-${
d.value
}
`,async()=>{
if(!f)return null;
try{
return(await $fetch(`${
f
}
/api/global`,{
params:{
"populate[seo][populate][og_image][fields][0]":"url","fields[0]":"id","fields[1]":"desc_home",locale:d.value
}

}
))?.data??null
}
catch{
return null
}

}
,{
getCachedData:Mn
}
)),y=await y,I(),y),x=q(()=>je.value?.seo??null),p=q(()=>je.value?.desc_home??""),g=q(()=>Oo(x.value,{
title:d.value==="it"?"K95 — Studio di grafica, brand e comunicazione a Catania":"K95 — Brand & Digital Design Studio",description:d.value==="it"?"K95 è uno studio di brand, digital design e agenzia di comunicazione di Catania. Si occupa di brand, identità visiva, UI, web design e social media.":"Brand & Digital Design Studio based in Catania, Italy. Brand identity, digital design, motion and web."
}
));
Ao({
title:q(()=>g.value.title),description:q(()=>g.value.description),ogImage:q(()=>g.value.ogImage),keywords:q(()=>g.value.keywords),noIndex:q(()=>g.value.noIndex)
}
);
const Z=Co(),Q=te(!0),G=te(!1),ne=it("heroTransition",()=>null),E=it("transition",()=>null),oe=it("skipNextTransition",()=>!1),{
displayedProject:ae,isLabelVisible:de,onHover:Le
}
=Mo(),Y=te(!1),T=te(!1),_=q(()=>Q.value&&!de.value&&!Y.value&&!T.value);
let K=null;
function fe(){
Y.value=!0
}
function J(o){
if(K||(K=document.querySelector(".nav")),!K){
T.value=!1;
return
}
const l=K.getBoundingClientRect();
T.value=o.clientX>=l.left&&o.clientX<=l.right&&o.clientY>=l.top&&o.clientY<=l.bottom
}
const ee=q(()=>Me.value.slice(0,13)),st=window.matchMedia("(max-width: 767px)"),Pe=()=>st?.matches??!1,ze=window.matchMedia("(hover: none)").matches,Re=o=>ze&&o.imageSmall||o.image;
function De(o){
Q.value=o==="grid",o!=="grid"&&(de.value=!1)
}
function L(o){
if(!o)return o;
const l=Me.value.find(w=>w.slug===o.slug||w.id===o.id);
return{
...o,year:o.year??l?.year??"",image:o.image??l?.image??"",title:o.title??l?.title??""
}

}
const Te=te(0);
let re=null,W=null,k=null,X=null;
const me=te(!1);
let P=null,ie=null,pe=null;
function he(){
if(X)return Promise.resolve(!1);
const o=new AbortController;
return X=o,fetch("/3d/rosa.glb",{
signal:o.signal,credentials:"same-origin"
}
).then(async l=>l.ok?(await l.arrayBuffer(),!0):!1).catch(l=>(l?.name==="AbortError"||console.warn("[index] Failed to prewarm /3d/rosa.glb",l),!1)).finally(()=>{
X===o&&(X=null)
}
)
}
function Ve(){
Q.value=!0,de.value=!1,ne.value=null,Te.value+=1
}
function Be(){
const o=Pe();
if(re===null){
re=o;
return
}
o!==re&&(re=o,Ve())
}
Dn(()=>{
re=Pe(),window.addEventListener("resize",Be,{
passive:!0
}
),window.addEventListener("wheel",fe,{
passive:!0,once:!0
}
),window.addEventListener("touchmove",fe,{
passive:!0,once:!0
}
),window.addEventListener("mousemove",J,{
passive:!0
}
),P=()=>{
me.value=!0
}
,ie=()=>{
me.value=!1
}
,!(document.documentElement.getAttribute("data-boot")==="1")&&!E.value?.isRunning&&requestAnimationFrame(()=>P?.()),document.addEventListener("app:loading:end",P),document.addEventListener("app:page-filter-cleared",P),document.addEventListener("page:out-start",ie),pe=window.setTimeout(()=>P?.(),4e3),k=window.setTimeout(()=>{
k=null,he()
}
,0)
}
),at(Me,o=>{
const l=(o??[]).map(Re).filter(Boolean);
l.length&&(W!==null&&clearTimeout(W),W=window.setTimeout(()=>{
W=null,Bn(l,{
concurrency:4,highPriorityCount:8,timeoutMs:4500
}
)
}
,180))
}
,{
immediate:!0
}
),Lo(()=>{
window.removeEventListener("resize",Be),window.removeEventListener("wheel",fe),window.removeEventListener("touchmove",fe),window.removeEventListener("mousemove",J),P&&(document.removeEventListener("app:loading:end",P),document.removeEventListener("app:page-filter-cleared",P),P=null),ie&&(document.removeEventListener("page:out-start",ie),ie=null),pe&&(clearTimeout(pe),pe=null),k!==null&&(clearTimeout(k),k=null),X&&(X.abort(),X=null),W!==null&&(clearTimeout(W),W=null)
}
);
async function Ge(o){
const l=L(o),w=M(`/projects/${
l.slug
}
`);
if(Pe()){
ne.value=null,E.value?.play?E.value.play(()=>Z.push(w)):Z.push(w);
return
}
ne.value={
...l,fromHome:!0
}
;
const F=new Image;
F.onload=F.onerror=()=>{
oe.value=!0,Z.push(w)
}
,F.src=l.image
}
return(o,l)=>{
const w=oa,F=Io,be=To,Ie=Bo("i18n-t");
return rt(),It("main",{
class:Fe(["home",{
"is-focusing":!Q.value
}
])
}
,[B("h1",aa,We(ce(U)("home_h1")),1),(rt(),yn(w,{
key:Te.value,projects:Me.value,spiral:G.value,onHoverProject:ce(Le),onOpenProject:Ge,onFocusStateChange:De
}
,null,8,["projects","spiral","onHoverProject"])),B("div",{
class:Fe(["layout-switch",{
"is-revealed":me.value,"is-hidden":!Q.value,"is-spiral":G.value
}
])
}
,[l[2]||(l[2]=B("span",{
class:"layout-switch__pill","aria-hidden":"true"
}
,null,-1)),B("button",{
type:"button",class:Fe(["layout-switch__btn",{
"is-active":!G.value
}
]),"data-hover":"",onClick:l[0]||(l[0]=R=>G.value=!1)
}
," Rings ",2),B("button",{
type:"button",class:Fe(["layout-switch__btn",{
"is-active":G.value
}
]),"data-hover":"",onClick:l[1]||(l[1]=R=>G.value=!0)
}
," Spiral ",2)],2),B("div",ra,[(rt(!0),It(Po,null,Ro(ee.value,R=>(rt(),yn(F,{
key:R.slug,to:ce(M)(`/projects/${
R.slug
}
`),class:"home-seo__item",tabindex:"-1"
}
,{
default:nt(()=>[B("img",{
src:R.imageSmall||R.image,alt:`${
R.title
}
${
R.categories?.length?" — "+R.categories.map(Ae=>Ae.name).join(", "):""
}
`,loading:"lazy",fetchpriority:"low",decoding:"async"
}
,null,8,ia)]),_:2
}
,1032,["to"]))),128))]),Dt(be,{
project:ce(ae),isLabelVisible:ce(de),scrollCue:_.value
}
,null,8,["project","isLabelVisible","scrollCue"]),B("footer",{
class:Fe(["home-footer",{
"is-revealed":me.value
}
])
}
,[B("span",sa,[B("span",la,We(p.value||"BRAND & DIGITAL DESIGN STUDIO BASED IN ITALY."),1)]),B("span",ca,[Dt(Ie,{
keypath:"selected_works",tag:"span",class:"home-footer__line"
}
,{
n:nt(()=>[Sn("12 / "+We(Me.value.length||20),1)]),sel:nt(()=>[B("span",ua,We(ce(U)("selected_adj")),1)]),link:nt(()=>[Dt(F,{
to:ce(M)("/works"),class:"home-footer__link","data-hover":""
}
,{
default:nt(()=>[Sn(We(ce(U)("works_link")),1)]),_:1
}
,8,["to"])]),_:1
}
)]),B("span",da,[B("span",fa,"© "+We(ce(Se)),1)])],2)],2)
}

}

}
,ba=Rn(pa,[["__scopeId","data-v-3e8f568a"]]);
export{
ba as default
}
;

