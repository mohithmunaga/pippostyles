import fs from 'fs';

const files = ['BAt6UgCr.js', 'CX9Kzh5a.js', 'C64vahhe.js', 'CY4PXAcZ.js'];

for (const file of files) {
  const content = fs.readFileSync('./scripts/' + file, 'utf8');
  console.log(`=== ${file} ===`);
  
  // Look for .glb or .gltf or .spline or .bin or .hdr or .exr
  const models = content.match(/[\w\/\.-]+\.(glb|gltf|spline|splinecode|bin|hdr|exr|obj|fbx)/gi);
  if (models) console.log('3D models/assets:', models);

  // Look for Three.js exports or classes
  const threeKeywords = ['WebGLRenderer', 'PerspectiveCamera', 'InstancedMesh', 'MeshPhysicalMaterial', 'ShaderMaterial', 'GLTFLoader', 'DRACOLoader', 'TorusKnotGeometry', 'PlaneGeometry', 'spline'];
  for (const kw of threeKeywords) {
    if (content.includes(kw)) console.log(`  Contains keyword: ${kw}`);
  }
}
