GeometryWars.Shapes = (function() {

  const Constants = {
    RenderLayers: {
      STANDARD: 1,
      BLOOM: 2
    }
  }

  let colors = [
    new THREE.Color('red'),
    new THREE.Color('deeppink'),
    new THREE.Color('orange'),
    new THREE.Color('yellow'),
    new THREE.Color('khaki'),
    new THREE.Color('indigo'),
    new THREE.Color('fuchsia'),
    new THREE.Color('green'),
    new THREE.Color('lime'),
    new THREE.Color('aqua'),
    new THREE.Color('blue'),
    new THREE.Color('cornsilk'),
    new THREE.Color('goldenrod')
  ];

  function createMesh(objectDefinition) {
    return new Promise(function(resolve, reject) {
      let geometry = objectDefinition.createGeometry();
      let material = new THREE.MeshPhongMaterial({
        color: colors[Math.floor(Math.random() * colors.length)]
      });
      let mesh = new THREE.Mesh(geometry, material);
      mesh.layers.enable(Constants.RenderLayers.BLOOM);
      let edges = new THREE.EdgesGeometry(geometry);
      let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 4
      }));
      // resolve(mesh);
      let obj = new THREE.Object3D();
      obj.add(mesh);
      obj.add(line);
      obj.userData.tweenTarget = {
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.01, y: 0.01, z: 0.01 }
      };
      obj.scale.set(0.01, 0.01, 0.01);
      obj.userData.characterID = GeometryWars.Tools.uuidv4();
      resolve(obj);
    });
  }

  const Tetrahedron = {
    name: "Tetrahedron",
    description: "Also known as a triangular pyramid, this geometry consists of four congruent equilateral triangles.",
    createGeometry: () => new THREE.TetrahedronGeometry(1, 0),
    create: function() {
      return createMesh(this);
    }
  };

  const Cube = {
    name: "Cube",
    description: "A geometry bounded by six equal square faces.",
    createGeometry: () => new THREE.BoxGeometry(1, 1, 1),
    create: function() {
      return createMesh(this);
    }
  };

  const Octahedron = {
    name: "Octahedron",
    description: "A geometry bounded by eight equilateral triangles.",
    createGeometry: () => new THREE.OctahedronGeometry(1, 0),
    create: function() {
      return createMesh(this);
    }
  };

  const Dodecahedron = {
    name: "Dodecahedron",
    description: "A geometry bounded by twelve equal faces.",
    createGeometry: () => new THREE.DodecahedronGeometry(1, 0),
    create: function() {
      return createMesh(this);
    }
  };

  const Icosahedron = {
    name: "Icosahedron",
    description: "A geometry bounded by twenty equal faces.",
    createGeometry: () => new THREE.IcosahedronGeometry(1, 0),
    create: function() {
      return createMesh(this);
    }
  };

  return {
    Tetrahedron: Tetrahedron,
    Cube: Cube,
    Octahedron: Octahedron,
    Dodecahedron: Dodecahedron,
    Icosahedron: Icosahedron
  }

})();
