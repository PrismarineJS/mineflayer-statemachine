/* globals Tree */
"use strict";

var tree = new Tree(document.getElementById("tree"), {
  navigate: false, // allow navigate with ArrowUp and ArrowDown
});

// tree.on("open", (e) => console.log("open", e));

tree.on("select", (e) => {
  console.log(e.node?.id)
});

tree.on("action", (e) => console.log("action", e));
tree.on("fetch", (e) => console.log("fetch", e));
// tree.on("browse", (e) => console.log("browse", e));

var structure = [
  {
    id: 1,
    name: "file 1",
    selected: true,
  },
  {
    id: 2,
    name: "file 2",
  },
  {
    id: 3,
    name: "folder 1",
    open: true,
    type: Tree.FOLDER,

    children: [
      {
        id: 4,
        name: "file 1/1",
      },
      {
        id: 5,
        name: "file 1/2",
      },
      {
        id: 6,
        name: "folder 1/1",
        open: true,
        type: Tree.FOLDER,
        children: [
          {
            id: 7,
            name: "folder 1/1/1",
            open: true,
            type: Tree.FOLDER,
            children: [
              {
                id: 8,
                name: "folder 1/1/1/1",
                open: true,
                type: Tree.FOLDER,
                children: [
                  {
                    id: 9,
                    name: "file 1/1/1/1/1",
                  },
                  {
                    id: 10,
                    name: "file 1/1/1/1/2",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 11,
    name: "folder 2",
    open: true,
    type: Tree.FOLDER,
    children: [
      {
        id: 11,
        name: "file 1/1/1/1/1",
      },
      {
        id: 12,
        name: "file 1/1/1/1/2",
      },
    ],
  },
];

// keep track of the original node objects
tree.on("created", (e, node) => {
  e.node = node;
});

tree.json(structure);

setTimeout(() => {
  tree.forEach((e) => {
    if ([10, 8, 7, 6, 3].includes(e.node.id))
      e.classList.add('active')
  })
}, 500)

setTimeout(() => {
  tree.find((e) => e.node.id === 10)
}, 500)

// document.getElementById("browse-1").addEventListener("click", () => {
//   tree.browse((a) => {
//     if (a.node.name === "folder 2 (asynced)" || a.node.name === "file 2/2") {
//       return true;
//     }
//     return false;
//   });
// });

// document.getElementById("browse-2").addEventListener("click", () => {
//   tree.browse((a) => [3, 6, 7, 8].includes(a.node.id))
// });

// document.getElementById("unload").addEventListener("click", () => {
//   const d = tree.hierarchy().pop();
//   tree.unloadFolder(d);
// });

// document.getElementById("previous").addEventListener("click", () => {
//   tree.navigate("backward");
// });