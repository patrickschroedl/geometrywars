GeometryWars = (function() {

  const Constants = {
    RenderLayers: {
      STANDARD: 1,
      BLOOM: 2
    },
    Camera: {
      fov: 60,
      renderDistance: {
        near: 0.01,
        far: 1000
      },
      distance: {
        minimum: 14,
        maximum: 34,
        default: 24
      },
      rotation: {
        horizontal: {
          default: 0
        },
        vertical: {
          minimum: Math.PI / 2 * 0.3,
          maximum: Math.PI / 2 * 0.9,
          default: Math.PI / 2 * 0.7
        }
      }
    }
  };
  let GUIController = {
    enableBloomRendering: true
  };

  let gui;
  let canvas, scene, camera, mouse, renderer, renderCall, raycaster, lights;
  let bloomLayer, bloomMaskMaterial, bloomMaterialStore, bloomPass, bloomComposer, finalPass, finalComposer, fxaaPass;
  let characters = new Set();

  function init() {
    THREE.Cache.enabled = true;
    canvas = document.getElementById('canvas');
    scene = new THREE.Scene();
    setListeners();
    initCamera();
    initScene();
    initLighting();
    initGUI();
    renderScene();
    setTimeout(titleSequence, 1000);
  }
  function setListeners() {
    window.addEventListener('resize', clientResize, false);
  }
  function initGUI() {
    gui = new dat.GUI();
    gui.close();
    gui.folders = {};
    gui.folders.rendering = gui.addFolder('Rendering');
    gui.add(GUIController, 'enableBloomRendering').listen().name('Enable Bloom');
    gui.folders.bloom = gui.addFolder('Bloom Parameters');
    gui.add(bloomPass, 'exposure').listen().name('Exposure');
    gui.add(bloomPass, 'threshold').listen().name('Threshold');
    gui.add(bloomPass, 'strength').listen().name('Strength');
    gui.add(bloomPass, 'radius').listen().name('Radius');
    gui.folders.ambientLight = gui.addFolder('Ambient Light');
    gui.add(lights['ambient'], 'visible').listen().name('Active');
    gui.add(lights['ambient'], 'intensity', 0, 1, 0.01).listen().name('Intensity');
    gui.folders.hemisphereLight = gui.addFolder('Hemisphere Light');
    gui.add(lights['hemisphere'], 'visible').listen().name('Active');
    gui.add(lights['hemisphere'], 'intensity', 0, 1, 0.01).listen().name('Intensity');
    gui.folders.functions = gui.addFolder('Functions');
    gui.add({ printCharacters: function() { console.log(characters); } }, 'printCharacters').name('printCharacters()');
    gui.add({ printCharacterIDs: function() { [...characters].map(character => console.log(character.userData.characterID)); } }, 'printCharacterIDs').name('printCharacterIDs()');
  }
  function initCamera() {
    camera = new THREE.PerspectiveCamera(
      Constants.Camera.fov,
      window.innerWidth / window.innerHeight,
      Constants.Camera.renderDistance.near,
      Constants.Camera.renderDistance.far
    );
    camera.position.set(0, 0, 20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  }
  function initScene() {
    scene.background = new THREE.Color('rgb(2, 2, 2)');
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvas
    });
    renderer.toneMapping = THREE.CineonToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    bloomLayer = new THREE.Layers();
    bloomLayer.set(Constants.RenderLayers.BLOOM);
    bloomMaskMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
    bloomMaterialStore = {};
    renderCall = new THREE.RenderPass(scene, camera);
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.exposure = 1.0;
    bloomPass.threshold = 0.0;
    bloomPass.strength = 0.8;
    bloomPass.radius = 2.0;
    // TODO: replace FXAA with SMAA
    fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    fxaaPass.uniforms['resolution'].value.set((1 / window.innerWidth), (1 / window.innerHeight));
    fxaaPass.renderToScreen = true;
    bloomComposer = new THREE.EffectComposer(renderer);
    bloomComposer.addPass(renderCall);
    bloomComposer.addPass(bloomPass);
    bloomComposer.addPass(fxaaPass);
    finalPass = new THREE.ShaderPass(
      new THREE.ShaderMaterial( {
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        defines: {}
      } ), "baseTexture"
    );
    finalPass.needsSwap = true;
    finalComposer = new THREE.EffectComposer(renderer);
    finalComposer.addPass(renderCall);
    finalComposer.addPass(finalPass);
    finalComposer.addPass(fxaaPass);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
  }
  function initLighting() {
    lights = {};
    let ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    lights['ambient'] = ambientLight;
    scene.add(ambientLight);
    let hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.8);
    lights['hemisphere'] = hemisphereLight;
    scene.add(hemisphereLight);
    var size = 100;
    var divisions = 100;
    var gridHelper = new THREE.GridHelper( size, divisions );
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -2;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.2;
    scene.add(gridHelper);
  }
  function titleSequence() {
    setTimeout(function() {
      let title = [...'Geometry Wars'];
      let count = 0;
      let lastText = '';
      while (title.length) {
        count++;
        let newText = lastText + title.shift();
        lastText = newText;
        setTimeout(function() {
          $('span.title').text(newText);
        }, (count * 100));
      }
    }, 3000);
    setTimeout(createShapes, 4000);
    setTimeout(function() {
      $('#canvas').css('opacity', '1');
    }, 1000);
  }

  setInterval(function() {
    // return;
    scene.traverse(child => {
      if (child.type !== 'Object3D') return;
      let desiredScale = 1 + ((Math.random() * 0.4) - 0.2);
      let scaleReference = {
        x: child.scale.x,
        y: child.scale.y,
        z: child.scale.z
      };
      let scalingTween = new TWEEN.Tween(scaleReference)
        .to({
          x: desiredScale,
          y: desiredScale,
          z: desiredScale
        }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          child.scale.set(scaleReference.x, scaleReference.y, scaleReference.z);
        })
        .start();
      let rotationReference = {
        x: child.rotation.x,
        y: child.rotation.y,
        z: child.rotation.z
      };
      let rotationTween = new TWEEN.Tween(rotationReference)
        .to({
          x: Math.random() * Math.PI,
          y: Math.random() * Math.PI,
          z: Math.random() * Math.PI
        }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          child.rotation.set(rotationReference.x, rotationReference.y, rotationReference.z);
        })
        .start();
    });
  }, 1000);

  function updateRotationDampening(object) {
    if (!object.userData.desiredRotation) return;
    object.rotation.set(
      GeometryWars.Tools.dampenVectorChange(object.rotation.x, object.userData.desiredRotation.x, 1),
      GeometryWars.Tools.dampenVectorChange(object.rotation.x, object.userData.desiredRotation.x, 1),
      GeometryWars.Tools.dampenVectorChange(object.rotation.x, object.userData.desiredRotation.x, 1)
    );
  }

  function renderScene(time) {
    TWEEN.update(time);
    scene.traverse(updateRotationDampening);
    updateCamera();
    GUIController.enableBloomRendering ? renderEffectPasses() : renderer.render(scene, camera);
    requestAnimationFrame(renderScene);
  }
  function renderEffectPasses() {
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
    finalComposer.render();
  }
  function updateCamera() {
    camera.updateProjectionMatrix();
  }

  function darkenNonBloomed(obj) {
    if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
      bloomMaterialStore[obj.uuid] = obj.material;
      obj.material = bloomMaskMaterial;
    }
  }
  function restoreMaterial(obj) {
    if (bloomMaterialStore[obj.uuid]) {
      obj.material = bloomMaterialStore[obj.uuid];
      delete bloomMaterialStore[obj.uuid];
    }
  }

  function getCharacterObjectById(id) {
    // return [...characters].filter(character => character.userData.characterID === id);
    let result;
    characters.forEach(function(character) {
      if (!result && character.userData.characterID === id) result = character;
    });
    return result;
  }

  function clientResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  init();

  function createShapes() {
    GeometryWars.Shapes.Tetrahedron.create().then(shapeObject => {
      shapeObject.position.set(-8, 2, 0);
      scene.add(shapeObject);
      let tween = new TWEEN.Tween(shapeObject.userData.tweenTarget.scale)
        .to({ x: 1, y: 1, z: 1 }, 4000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => { shapeObject.scale.set(shapeObject.userData.tweenTarget.scale.x, shapeObject.userData.tweenTarget.scale.y, shapeObject.userData.tweenTarget.scale.z); })
        .start();
      characters.add(shapeObject);
    });
    GeometryWars.Shapes.Cube.create().then(shapeObject => {
      shapeObject.position.set(-4, 2, 0);
      scene.add(shapeObject);
      let tween = new TWEEN.Tween(shapeObject.userData.tweenTarget.scale)
        .to({ x: 1, y: 1, z: 1 }, 4000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => { shapeObject.scale.set(shapeObject.userData.tweenTarget.scale.x, shapeObject.userData.tweenTarget.scale.y, shapeObject.userData.tweenTarget.scale.z); })
        .start();
      characters.add(shapeObject);
    });
    GeometryWars.Shapes.Octahedron.create().then(shapeObject => {
      shapeObject.position.set(0, 2, 0);
      scene.add(shapeObject);
      let tween = new TWEEN.Tween(shapeObject.userData.tweenTarget.scale)
        .to({ x: 1, y: 1, z: 1 }, 4000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => { shapeObject.scale.set(shapeObject.userData.tweenTarget.scale.x, shapeObject.userData.tweenTarget.scale.y, shapeObject.userData.tweenTarget.scale.z); })
        .start();
      characters.add(shapeObject);
    });
    GeometryWars.Shapes.Dodecahedron.create().then(shapeObject => {
      shapeObject.position.set(4, 2, 0);
      scene.add(shapeObject);
      let tween = new TWEEN.Tween(shapeObject.userData.tweenTarget.scale)
        .to({ x: 1, y: 1, z: 1 }, 4000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => { shapeObject.scale.set(shapeObject.userData.tweenTarget.scale.x, shapeObject.userData.tweenTarget.scale.y, shapeObject.userData.tweenTarget.scale.z); })
        .start();
      characters.add(shapeObject);
    });
    GeometryWars.Shapes.Icosahedron.create().then(shapeObject => {
      shapeObject.position.set(8, 2, 0);
      scene.add(shapeObject);
      let tween = new TWEEN.Tween(shapeObject.userData.tweenTarget.scale)
        .to({ x: 1, y: 1, z: 1 }, 4000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => { shapeObject.scale.set(shapeObject.userData.tweenTarget.scale.x, shapeObject.userData.tweenTarget.scale.y, shapeObject.userData.tweenTarget.scale.z); })
        .start();
      characters.add(shapeObject);
    });
  }

  return {};

})();
