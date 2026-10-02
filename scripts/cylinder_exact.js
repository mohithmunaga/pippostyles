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