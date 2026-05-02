(function(Scratch) {
  // ========== MinHeap ==========
  class MinHeap {
    constructor(fn) {
      this.h = [];
      this.k = fn;
      this.map = new Map();
      this.idx = new Map();
    }
    size() { return this.h.length; }
    push(x) {
      this.h.push(x);
      this.map.set(x.x + ',' + x.y, x);
      this.idx.set(x, this.h.length - 1);
      this._up(this.h.length - 1);
    }
    pop() {
      if (!this.h.length) return null;
      const o = this.h[0];
      const l = this.h.pop();
      this.map.delete(o.x + ',' + o.y);
      this.idx.delete(o);
      if (this.h.length) {
        this.h[0] = l;
        this.idx.set(l, 0);
        this._dn(0);
      }
      return o;
    }
    find(x, y) {
      return this.map.get(x + ',' + y) || null;
    }
    upd(x) {
      const i = this.idx.get(x);
      if (i !== undefined) this._up(i);
    }
    _swap(i, j) {
      const a = this.h[i], b = this.h[j];
      this.h[i] = b; this.h[j] = a;
      this.idx.set(a, j);
      this.idx.set(b, i);
    }
    _up(i) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this.k(this.h[i]) < this.k(this.h[p])) {
          this._swap(i, p);
          i = p;
        } else break;
      }
    }
    _dn(i) {
      while (true) {
        let s = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < this.h.length && this.k(this.h[l]) < this.k(this.h[s])) s = l;
        if (r < this.h.length && this.k(this.h[r]) < this.k(this.h[s])) s = r;
        if (s !== i) {
          this._swap(i, s);
          i = s;
        } else break;
      }
    }
  }

  // ========== 寻路扩展 ==========
  class PathfindingExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.grid = null; this.w = 0; this.h = 0;
      this.sx = -1; this.sy = -1; this.ex = -1; this.ey = -1;
      this.diag = false; this.corner = false;
      this.path = [];
      this.pathStr = "";
      this.pathLen = 0;
      this._lastTime = 0;
      this.STAGE_W = 480;
      this.STAGE_H = 360;
      this.dWin = null; this.dCvs = null; this.dCtx = null;
      this.cSize = 20; this.dragW = false;
      this.drawG = false; this.lCX = -1; this.lCY = -1; this.addMode = true;
      this._worker = null;
      this._setupWorker();
      setTimeout(() => this._mkDbg(), 0);
    }

    _scratchToGridX(sx) {
      return Math.min(this.w - 1, Math.max(0, Math.floor((sx + this.STAGE_W/2) / this.STAGE_W * this.w)));
    }
    _scratchToGridY(sy) {
      return Math.min(this.h - 1, Math.max(0, Math.floor((this.STAGE_H/2 - sy) / this.STAGE_H * this.h)));
    }
    _gridToScratchX(col) {
      return -this.STAGE_W/2 + (col + 0.5) * (this.STAGE_W / this.w);
    }
    _gridToScratchY(row) {
      return this.STAGE_H/2 - (row + 0.5) * (this.STAGE_H / this.h);
    }

    _getSpriteNames() {
      try {
        const targets = this.runtime.targets;
        if (!targets) return [];
        const names = [];
        for (const t of targets) {
          if (t && !t.isStage && t.sprite && t.sprite.name) names.push(t.sprite.name);
        }
        return names;
      } catch (e) { return []; }
    }

    getSpriteMenuItems() { return this._getSpriteNames(); }

    getInfo() {
      return {
        id: 'pathfinding',
        name: '寻路 (舞台坐标)',
        blocks: [
          { opcode:'createGrid', blockType: Scratch.BlockType.COMMAND, text: '创建网格 宽 [W] 高 [H]', arguments:{ W:{ type:Scratch.ArgumentType.NUMBER, defaultValue:10 }, H:{ type:Scratch.ArgumentType.NUMBER, defaultValue:10 } } },
          { opcode:'setStart', blockType: Scratch.BlockType.COMMAND, text: '设置起点 X:[X] Y:[Y]', arguments:{ X:{ type:Scratch.ArgumentType.NUMBER, defaultValue:-200 }, Y:{ type:Scratch.ArgumentType.NUMBER, defaultValue:120 } } },
          { opcode:'setEnd', blockType: Scratch.BlockType.COMMAND, text: '设置终点 X:[X] Y:[Y]', arguments:{ X:{ type:Scratch.ArgumentType.NUMBER, defaultValue:200 }, Y:{ type:Scratch.ArgumentType.NUMBER, defaultValue:-120 } } },
          { opcode:'addObst', blockType: Scratch.BlockType.COMMAND, text: '添加障碍点 X:[X] Y:[Y]', arguments:{ X:{ type:Scratch.ArgumentType.NUMBER, defaultValue:0 }, Y:{ type:Scratch.ArgumentType.NUMBER, defaultValue:0 } } },
          { opcode:'remObst', blockType: Scratch.BlockType.COMMAND, text: '移除障碍点 X:[X] Y:[Y]', arguments:{ X:{ type:Scratch.ArgumentType.NUMBER, defaultValue:0 }, Y:{ type:Scratch.ArgumentType.NUMBER, defaultValue:0 } } },
          { opcode:'placeSpriteAsObstacle', blockType: Scratch.BlockType.COMMAND, text: '放置角色 [SPRITE] 造型 [COSTUME] 于 X:[X] Y:[Y] 缩放X:[SX] Y:[SY] 旋转:[ROT]° 为障碍物', arguments: {
            SPRITE: { type: Scratch.ArgumentType.STRING, menu: 'spriteMenu' },
            COSTUME: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            SX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            SY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            ROT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
          } },
          { opcode:'setRules', blockType: Scratch.BlockType.COMMAND, text: '设置 [DIAG] 对角线移动，[COR] 跨角落', arguments:{ DIAG:{ type:Scratch.ArgumentType.STRING, menu:'yn', defaultValue:'禁止' }, COR:{ type:Scratch.ArgumentType.STRING, menu:'yn', defaultValue:'禁止' } } },
          { opcode:'findPath', blockType: Scratch.BlockType.COMMAND, text: '执行寻路 算法 [ALG]', arguments:{ ALG:{ type:Scratch.ArgumentType.STRING, menu:'alg', defaultValue:'AStar' } } },
          { opcode:'getLen', blockType: Scratch.BlockType.REPORTER, text: '路径长度 (格子数)' },
          { opcode:'getStr', blockType: Scratch.BlockType.REPORTER, text: '路径字符串' },
          { opcode:'getPt', blockType: Scratch.BlockType.REPORTER, text: '路径第 [IDX] 个点的 [AX] 坐标', arguments:{ IDX:{ type:Scratch.ArgumentType.NUMBER, defaultValue:0 }, AX:{ type:Scratch.ArgumentType.STRING, menu:'ax', defaultValue:'X' } } },
          { opcode:'getTime', blockType: Scratch.BlockType.REPORTER, text: '寻路耗时 (ms)' },
          { opcode:'getObstacleList', blockType: Scratch.BlockType.REPORTER, text: '障碍物列表' },
          { opcode:'getObstacleSVG', blockType: Scratch.BlockType.REPORTER, text: '障碍物 SVG' },
          { opcode:'showWin', blockType: Scratch.BlockType.COMMAND, text: '显示调试窗口' },
          { opcode:'hideWin', blockType: Scratch.BlockType.COMMAND, text: '隐藏调试窗口' }
        ],
        menus: {
          yn: { acceptReporters: false, items: ['允许','禁止'] },
          alg: { acceptReporters: false, items: ['AStar','BestFirst','BreadthFirst','Dijkstra','IDAStar','JumpPoint','OrthogonalJumpPoint','BiAStar','BiBestFirst','BiBreadthFirst','BiDijkstra'] },
          ax: { acceptReporters: false, items: ['X','Y'] },
          spriteMenu: { acceptReporters: false, items: 'getSpriteMenuItems' }
        }
      };
    }

    _setupWorker() {
      const workerBlob = new Blob([`
        class MinHeap {
          constructor(fn) {
            this.h = [];
            this.k = fn;
            this.map = new Map();
            this.idx = new Map();
          }
          size() { return this.h.length; }
          push(x) {
            this.h.push(x);
            this.map.set(x.x + ',' + x.y, x);
            this.idx.set(x, this.h.length - 1);
            this._up(this.h.length - 1);
          }
          pop() {
            if (!this.h.length) return null;
            const o = this.h[0];
            const l = this.h.pop();
            this.map.delete(o.x + ',' + o.y);
            this.idx.delete(o);
            if (this.h.length) {
              this.h[0] = l;
              this.idx.set(l, 0);
              this._dn(0);
            }
            return o;
          }
          find(x, y) { return this.map.get(x + ',' + y) || null; }
          upd(x) {
            const i = this.idx.get(x);
            if (i !== undefined) this._up(i);
          }
          _swap(i, j) {
            const a = this.h[i], b = this.h[j];
            this.h[i] = b; this.h[j] = a;
            this.idx.set(a, j); this.idx.set(b, i);
          }
          _up(i) {
            while (i > 0) {
              const p = (i - 1) >> 1;
              if (this.k(this.h[i]) < this.k(this.h[p])) {
                this._swap(i, p);
                i = p;
              } else break;
            }
          }
          _dn(i) {
            while (true) {
              let s = i, l = 2 * i + 1, r = 2 * i + 2;
              if (l < this.h.length && this.k(this.h[l]) < this.k(this.h[s])) s = l;
              if (r < this.h.length && this.k(this.h[r]) < this.k(this.h[s])) s = r;
              if (s !== i) {
                this._swap(i, s);
                i = s;
              } else break;
            }
          }
        }

        function ok(x, y, w, h) { return x >= 0 && x < w && y >= 0 && y < h; }

        function heuristic(a, b, diag) {
          const dx = Math.abs(a.x - b.x);
          const dy = Math.abs(a.y - b.y);
          return diag ? Math.max(dx, dy) : dx + dy;
        }

        function neighbors(node, grid, w, h, diag, corner) {
          const res = [];
          const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
          for (const d of dirs) {
            const nx = node.x + d[0], ny = node.y + d[1];
            if (ok(nx, ny, w, h) && grid[ny][nx] === 0) res.push({x:nx, y:ny});
          }
          if (diag) {
            const diags = [[-1,-1],[-1,1],[1,-1],[1,1]];
            for (const d of diags) {
              const nx = node.x + d[0], ny = node.y + d[1];
              if (!ok(nx, ny, w, h) || grid[ny][nx] === 1) continue;
              if (corner) {
                res.push({x:nx, y:ny});
              } else {
                if (grid[node.y + d[1]][node.x] === 0 && grid[node.y][node.x + d[0]] === 0) {
                  res.push({x:nx, y:ny});
                }
              }
            }
          }
          return res;
        }

        function buildPath(node) {
          const r = [];
          while (node) { r.unshift({x:node.x, y:node.y}); node = node.p; }
          return r;
        }

        function AStar(s, e, grid, w, h, diag, corner) {
          const open = new MinHeap(n => n.f);
          const sn = { x: s.x, y: s.y, g: 0, f: heuristic(s, e, diag), p: null };
          open.push(sn);
          const closed = new Set();
          while (open.size()) {
            const cur = open.pop();
            const key = cur.x + ',' + cur.y;
            if (cur.x === e.x && cur.y === e.y) return buildPath(cur);
            if (closed.has(key)) continue;
            closed.add(key);
            for (const nb of neighbors(cur, grid, w, h, diag, corner)) {
              const nbKey = nb.x + ',' + nb.y;
              if (closed.has(nbKey)) continue;
              const g = cur.g + 1;
              const exist = open.find(nb.x, nb.y);
              if (!exist) {
                open.push({ x: nb.x, y: nb.y, g, f: g + heuristic(nb, e, diag), p: cur });
              } else if (g < exist.g) {
                exist.g = g;
                exist.f = g + heuristic(exist, e, diag);
                exist.p = cur;
                open.upd(exist);
              }
            }
          }
          return null;
        }

        function BestFirst(s, e, grid, w, h, diag, corner) {
          const open = new MinHeap(n => n.f);
          open.push({ x: s.x, y: s.y, f: heuristic(s, e, diag), p: null });
          const closed = new Set();
          while (open.size()) {
            const cur = open.pop();
            const key = cur.x + ',' + cur.y;
            if (cur.x === e.x && cur.y === e.y) return buildPath(cur);
            if (closed.has(key)) continue;
            closed.add(key);
            for (const nb of neighbors(cur, grid, w, h, diag, corner)) {
              const nbKey = nb.x + ',' + nb.y;
              if (closed.has(nbKey)) continue;
              if (!open.find(nb.x, nb.y)) {
                open.push({ x: nb.x, y: nb.y, f: heuristic(nb, e, diag), p: cur });
              }
            }
          }
          return null;
        }

        function BFS(s, e, grid, w, h, diag, corner) {
          const q = [{ x: s.x, y: s.y, p: null }];
          const visited = new Set();
          visited.add(s.x + ',' + s.y);
          let qi = 0;
          while (qi < q.length) {
            const cur = q[qi++];
            if (cur.x === e.x && cur.y === e.y) return buildPath(cur);
            for (const nb of neighbors(cur, grid, w, h, diag, corner)) {
              const key = nb.x + ',' + nb.y;
              if (!visited.has(key)) {
                visited.add(key);
                q.push({ x: nb.x, y: nb.y, p: cur });
              }
            }
          }
          return null;
        }

        function Dijkstra(s, e, grid, w, h, diag, corner) {
          return AStar(s, e, grid, w, h, diag, corner, () => 0);
        }

        function IDAStar(s, e, grid, w, h, diag, corner) {
          let threshold = heuristic(s, e, diag);
          const path = [{ x: s.x, y: s.y }];
          const maxDepth = 5000;
          while (true) {
            const t = idaSearch(path, 0, new Set(), e, grid, w, h, diag, corner, threshold, maxDepth);
            if (t === true) return path;
            if (t === Infinity) return null;
            threshold = t;
          }
        }
        function idaSearch(path, g, visited, e, grid, w, h, diag, corner, threshold, maxDepth) {
          if (path.length > maxDepth) return Infinity;
          const node = path[path.length - 1];
          const f = g + heuristic(node, e, diag);
          if (f > threshold) return f;
          if (node.x === e.x && node.y === e.y) return true;
          let min = Infinity;
          const key = node.x + ',' + node.y;
          visited.add(key);
          for (const nb of neighbors(node, grid, w, h, diag, corner)) {
            const nbKey = nb.x + ',' + nb.y;
            if (visited.has(nbKey)) continue;
            path.push(nb);
            const t = idaSearch(path, g + 1, visited, e, grid, w, h, diag, corner, threshold, maxDepth);
            if (t === true) return true;
            if (t < min) min = t;
            path.pop();
          }
          visited.delete(key);
          return min;
        }

        function JPS(s, e, grid, w, h, corner) {
          const diag = true;
          const open = new MinHeap(n => n.f);
          open.push({ x: s.x, y: s.y, g: 0, f: heuristic(s, e, diag), p: null });
          const closed = new Set();
          while (open.size()) {
            const cur = open.pop();
            const key = cur.x + ',' + cur.y;
            if (cur.x === e.x && cur.y === e.y) return buildPath(cur);
            if (closed.has(key)) continue;
            closed.add(key);
            for (const [dx, dy] of jpDirs(cur, grid, w, h, corner)) {
              const jp = jump(cur.x, cur.y, dx, dy, e, grid, w, h, corner);
              if (!jp) continue;
              const jpKey = jp.x + ',' + jp.y;
              if (closed.has(jpKey)) continue;
              const g = cur.g + Math.max(Math.abs(jp.x - cur.x), Math.abs(jp.y - cur.y));
              const exist = open.find(jp.x, jp.y);
              if (!exist) {
                open.push({ x: jp.x, y: jp.y, g, f: g + heuristic(jp, e, diag), p: cur });
              } else if (g < exist.g) {
                exist.g = g;
                exist.f = g + heuristic(exist, e, diag);
                exist.p = cur;
                open.upd(exist);
              }
            }
          }
          return null;
        }

        function jpDirs(node, grid, w, h, corner) {
          const res = [];
          const allDirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
          if (node.p) {
            const dx = Math.sign(node.x - node.p.x), dy = Math.sign(node.y - node.p.y);
            if (dx !== 0 && dy !== 0) {
              if (ok(node.x + dx, node.y, w, h) && grid[node.y][node.x + dx] === 0) res.push([dx, 0]);
              if (ok(node.x, node.y + dy, w, h) && grid[node.y + dy][node.x] === 0) res.push([0, dy]);
              if (ok(node.x + dx, node.y + dy, w, h) && grid[node.y + dy][node.x + dx] === 0) res.push([dx, dy]);
            } else {
              if (dx !== 0) {
                if (ok(node.x + dx, node.y, w, h) && grid[node.y][node.x + dx] === 0) res.push([dx, 0]);
                if (ok(node.x + dx, node.y - 1, w, h) && (corner || grid[node.y - 1][node.x] === 0) && grid[node.y - 1][node.x + dx] === 0) res.push([dx, -1]);
                if (ok(node.x + dx, node.y + 1, w, h) && (corner || grid[node.y + 1][node.x] === 0) && grid[node.y + 1][node.x + dx] === 0) res.push([dx, 1]);
              } else {
                if (ok(node.x, node.y + dy, w, h) && grid[node.y + dy][node.x] === 0) res.push([0, dy]);
                if (ok(node.x - 1, node.y + dy, w, h) && (corner || grid[node.y][node.x - 1] === 0) && grid[node.y + dy][node.x - 1] === 0) res.push([-1, dy]);
                if (ok(node.x + 1, node.y + dy, w, h) && (corner || grid[node.y][node.x + 1] === 0) && grid[node.y + dy][node.x + 1] === 0) res.push([1, dy]);
              }
            }
          } else {
            for (const d of allDirs) {
              if (ok(node.x + d[0], node.y + d[1], w, h) && grid[node.y + d[1]][node.x + d[0]] === 0) res.push(d);
            }
          }
          return res.filter((v,i,a) => a.findIndex(t => t[0]===v[0]&&t[1]===v[1]) === i);
        }

        function jump(x, y, dx, dy, e, grid, w, h, corner) {
          const nx = x + dx, ny = y + dy;
          if (!ok(nx, ny, w, h) || grid[ny][nx] === 1) return null;
          if (nx === e.x && ny === e.y) return { x: nx, y: ny };
          if (dx !== 0 && dy !== 0) {
            if ((ok(nx - dx, ny, w, h) && grid[ny][nx - dx] === 0 && grid[ny - dy] && grid[ny - dy][nx - dx] === 1) ||
                (ok(nx, ny - dy, w, h) && grid[ny - dy][nx] === 0 && grid[ny - dy] && grid[ny - dy][nx - dx] === 1)) {
              return { x: nx, y: ny };
            }
            if (jump(nx, ny, dx, 0, e, grid, w, h, corner) || jump(nx, ny, 0, dy, e, grid, w, h, corner)) return { x: nx, y: ny };
          } else if (dx !== 0) {
            if ((ok(nx, ny - 1, w, h) && grid[ny - 1][nx] === 0 && grid[ny - 1][x] === 1) ||
                (ok(nx, ny + 1, w, h) && grid[ny + 1][nx] === 0 && grid[ny + 1][x] === 1)) {
              return { x: nx, y: ny };
            }
          } else {
            if ((ok(nx - 1, ny, w, h) && grid[ny][nx - 1] === 0 && grid[ny][x - 1] === 1) ||
                (ok(nx + 1, ny, w, h) && grid[ny][nx + 1] === 0 && grid[ny][x + 1] === 1)) {
              return { x: nx, y: ny };
            }
          }
          return jump(nx, ny, dx, dy, e, grid, w, h, corner);
        }

        function OJPS(s, e, grid, w, h, corner) {
          const diag = false;
          const open = new MinHeap(n => n.f);
          open.push({ x: s.x, y: s.y, g: 0, f: heuristic(s, e, diag), p: null });
          const closed = new Set();
          while (open.size()) {
            const cur = open.pop();
            const key = cur.x + ',' + cur.y;
            if (cur.x === e.x && cur.y === e.y) return buildPath(cur);
            if (closed.has(key)) continue;
            closed.add(key);
            for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const jp = oJump(cur.x, cur.y, dx, dy, e, grid, w, h);
              if (!jp) continue;
              const jpKey = jp.x + ',' + jp.y;
              if (closed.has(jpKey)) continue;
              const g = cur.g + Math.abs(jp.x - cur.x) + Math.abs(jp.y - cur.y);
              const exist = open.find(jp.x, jp.y);
              if (!exist) {
                open.push({ x: jp.x, y: jp.y, g, f: g + heuristic(jp, e, diag), p: cur });
              } else if (g < exist.g) {
                exist.g = g;
                exist.f = g + heuristic(exist, e, diag);
                exist.p = cur;
                open.upd(exist);
              }
            }
          }
          return null;
        }

        function oJump(x, y, dx, dy, e, grid, w, h) {
          const nx = x + dx, ny = y + dy;
          if (!ok(nx, ny, w, h) || grid[ny][nx] === 1) return null;
          if (nx === e.x && ny === e.y) return { x: nx, y: ny };
          if (dx !== 0) {
            if ((ok(nx, ny - 1, w, h) && grid[ny - 1][nx] === 0 && grid[ny - 1][x] === 1) ||
                (ok(nx, ny + 1, w, h) && grid[ny + 1][nx] === 0 && grid[ny + 1][x] === 1)) {
              return { x: nx, y: ny };
            }
          } else {
            if ((ok(nx - 1, ny, w, h) && grid[ny][nx - 1] === 0 && grid[ny][x - 1] === 1) ||
                (ok(nx + 1, ny, w, h) && grid[ny][nx + 1] === 0 && grid[ny][x + 1] === 1)) {
              return { x: nx, y: ny };
            }
          }
          return oJump(nx, ny, dx, dy, e, grid, w, h);
        }

        function bidirectional(s, e, grid, w, h, diag, corner, algo) {
          const nbr = (node) => neighbors(node, grid, w, h, diag, corner);
          if (algo === 'BiBreadthFirst') {
            return biBFS(s, e, nbr);
          }
          const openS = new MinHeap(n => n.f || n.g || 0);
          const openE = new MinHeap(n => n.f || n.g || 0);
          const startNode = { x: s.x, y: s.y, g: 0, p: null };
          const endNode = { x: e.x, y: e.y, g: 0, p: null };
          if (algo === 'BiAStar') {
            startNode.f = heuristic(s, e, diag);
            endNode.f = heuristic(e, s, diag);
          } else if (algo === 'BiBestFirst') {
            startNode.f = heuristic(s, e, diag);
            endNode.f = heuristic(e, s, diag);
          }
          openS.push(startNode);
          openE.push(endNode);
          const own = new Map(), other = new Map();
          own.set(s.x + ',' + s.y, startNode);
          other.set(e.x + ',' + e.y, endNode);
          while (openS.size() && openE.size()) {
            let result = expand(openS, openE, own, other, nbr, e, diag, algo, true);
            if (result) return result;
            result = expand(openE, openS, other, own, nbr, s, diag, algo, false);
            if (result) return result;
          }
          return null;
        }

        function expand(q, otherQ, own, other, nbr, target, diag, algo, fromStart) {
          const cur = q.pop();
          const key = cur.x + ',' + cur.y;
          if (other.has(key)) {
            return fromStart ? biPath(cur, other.get(key)) : biPath(other.get(key), cur);
          }
          for (const nb of nbr(cur)) {
            const nbKey = nb.x + ',' + nb.y;
            if (own.has(nbKey)) continue;
            const g = cur.g + 1;
            const exist = q.find(nb.x, nb.y);
            if (!exist) {
              const node = { x: nb.x, y: nb.y, g, p: cur };
              if (algo === 'BiAStar') node.f = g + heuristic(nb, target, diag);
              else if (algo === 'BiBestFirst') node.f = heuristic(nb, target, diag);
              q.push(node);
              own.set(nbKey, node);
            } else if (g < exist.g) {
              exist.g = g;
              exist.p = cur;
              if (algo === 'BiAStar') exist.f = g + heuristic(exist, target, diag);
              else if (algo === 'BiBestFirst') exist.f = heuristic(exist, target, diag);
              q.upd(exist);
            }
          }
          return null;
        }

        function biBFS(s, e, nbr) {
          const qs = [{ x: s.x, y: s.y, p: null }];
          const qe = [{ x: e.x, y: e.y, p: null }];
          const vs = new Map(), ve = new Map();
          vs.set(s.x + ',' + s.y, qs[0]);
          ve.set(e.x + ',' + e.y, qe[0]);
          let si = 0, ei = 0;
          while (si < qs.length && ei < qe.length) {
            if (qs.length - si <= qe.length - ei) {
              const cur = qs[si++];
              const key = cur.x + ',' + cur.y;
              if (ve.has(key)) return biPath(cur, ve.get(key));
              for (const nb of nbr(cur)) {
                const nbKey = nb.x + ',' + nb.y;
                if (!vs.has(nbKey)) {
                  const node = { x: nb.x, y: nb.y, p: cur };
                  qs.push(node);
                  vs.set(nbKey, node);
                }
              }
            } else {
              const cur = qe[ei++];
              const key = cur.x + ',' + cur.y;
              if (vs.has(key)) return biPath(vs.get(key), cur);
              for (const nb of nbr(cur)) {
                const nbKey = nb.x + ',' + nb.y;
                if (!ve.has(nbKey)) {
                  const node = { x: nb.x, y: nb.y, p: cur };
                  qe.push(node);
                  ve.set(nbKey, node);
                }
              }
            }
          }
          return null;
        }

        function biPath(fn, bn) {
          const fpath = [];
          let n = fn;
          while (n) { fpath.unshift({x:n.x,y:n.y}); n = n.p; }
          n = bn.p;
          while (n) { fpath.push({x:n.x,y:n.y}); n = n.p; }
          return fpath;
        }

        onmessage = function(e) {
          const { grid, w, h, sx, sy, ex, ey, diag, corner, algo } = e.data;
          const s = { x: sx, y: sy };
          const end = { x: ex, y: ey };
          if (!grid || s.x < 0 || end.x < 0 || grid[sy][sx] === 1 || grid[ey][ex] === 1) {
            postMessage({ path: null, time: 0 });
            return;
          }
          const t0 = performance.now();
          let path;
          switch (algo) {
            case 'AStar': path = AStar(s, end, grid, w, h, diag, corner); break;
            case 'BestFirst': path = BestFirst(s, end, grid, w, h, diag, corner); break;
            case 'BreadthFirst': path = BFS(s, end, grid, w, h, diag, corner); break;
            case 'Dijkstra': path = Dijkstra(s, end, grid, w, h, diag, corner); break;
            case 'IDAStar': path = IDAStar(s, end, grid, w, h, diag, corner); break;
            case 'JumpPoint': path = JPS(s, end, grid, w, h, corner); break;
            case 'OrthogonalJumpPoint': path = OJPS(s, end, grid, w, h, corner); break;
            case 'BiAStar': path = bidirectional(s, end, grid, w, h, diag, corner, 'BiAStar'); break;
            case 'BiBestFirst': path = bidirectional(s, end, grid, w, h, diag, corner, 'BiBestFirst'); break;
            case 'BiBreadthFirst': path = bidirectional(s, end, grid, w, h, diag, corner, 'BiBreadthFirst'); break;
            case 'BiDijkstra': path = bidirectional(s, end, grid, w, h, diag, corner, 'BiDijkstra'); break;
            default: path = AStar(s, end, grid, w, h, diag, corner);
          }
          const t1 = performance.now();
          postMessage({ path, time: Math.round((t1 - t0) * 100) / 100 });
        };
      `]);

      this._worker = new Worker(URL.createObjectURL(workerBlob));
      this._worker.onmessage = (e) => {
        const { path, time } = e.data;
        this._lastTime = time;
        if (path) {
          this.path = path.map(p => ({
            x: this._gridToScratchX(p.x),
            y: this._gridToScratchY(p.y)
          }));
          this.pathLen = path.length;
          this.pathStr = this.path.map(p => p.x + ',' + p.y).join(';');
        } else {
          this._clr();
        }
        this._draw();
        if (this._pendingResolve) {
          this._pendingResolve();
          this._pendingResolve = null;
        }
      };
    }

    _ok(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }

    createGrid(args) {
      const w = Math.floor(Number(args.W)), h = Math.floor(Number(args.H));
      if (w <= 0 || h <= 0) return;
      this.w = w; this.h = h;
      this.grid = Array.from({ length: h }, () => new Array(w).fill(0));
      this.sx = -1; this.sy = -1; this.ex = -1; this.ey = -1;
      this._clr(); this._draw();
    }

    setStart(args) {
      const gx = this._scratchToGridX(Number(args.X));
      const gy = this._scratchToGridY(Number(args.Y));
      if (this._ok(gx, gy)) { this.sx = gx; this.sy = gy; this._draw(); }
    }
    setEnd(args) {
      const gx = this._scratchToGridX(Number(args.X));
      const gy = this._scratchToGridY(Number(args.Y));
      if (this._ok(gx, gy)) { this.ex = gx; this.ey = gy; this._draw(); }
    }
    addObst(args) {
      const gx = this._scratchToGridX(Number(args.X));
      const gy = this._scratchToGridY(Number(args.Y));
      if (this.grid && this._ok(gx, gy)) { this.grid[gy][gx] = 1; this._draw(); }
    }
    remObst(args) {
      const gx = this._scratchToGridX(Number(args.X));
      const gy = this._scratchToGridY(Number(args.Y));
      if (this.grid && this._ok(gx, gy)) { this.grid[gy][gx] = 0; this._draw(); }
    }

    async placeSpriteAsObstacle(args) {
      if (!this.grid) return;
      const spriteName = args.SPRITE;
      const costumeName = (args.COSTUME || '').trim();
      const posX = Number(args.X);
      const posY = Number(args.Y);
      const scaleX = Number(args.SX);
      const scaleY = Number(args.SY);
      const rotDeg = Number(args.ROT);
      try {
        const target = this.runtime.getSpriteTargetByName(spriteName);
        if (!target) return;
        const costumes = target.getCostumes();
        if (!costumes || !costumes.length) return;
        let costume = null;
        if (costumeName) {
          costume = costumes.find(c => c.name === costumeName);
        }
        if (!costume) costume = costumes[0];
        const storage = this.runtime.storage;
        const dataFormat = String(
          costume.dataFormat ||
          (costume.asset && costume.asset.dataFormat) ||
          (costume.md5ext ? costume.md5ext.split('.').pop() : '') ||
          'png'
        ).toLowerCase();
        let asset = costume.asset || null;
        if ((!asset || !asset.data) && storage && costume.assetId) {
          const assetType = this._getImageAssetType(storage, dataFormat);
          if (assetType) {
            asset = await storage.load(assetType, costume.assetId, dataFormat);
          }
        }
        if (!asset || !asset.data) return;
        const mimeMap = {
          'png': 'image/png', 'svg': 'image/svg+xml', 'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg', 'bmp': 'image/bmp'
        };
        const mime = mimeMap[dataFormat] || 'image/png';
        const blob = new Blob([asset.data], { type: mime });
        let url = null, img = null;
        try {
          url = URL.createObjectURL(blob);
          img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('图片加载失败'));
            image.src = url;
          });
          const canvas = document.createElement('canvas');
          canvas.width = this.STAGE_W;
          canvas.height = this.STAGE_H;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const centerX = posX + this.STAGE_W/2;
          const centerY = this.STAGE_H/2 - posY;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(rotDeg * Math.PI / 180);
          ctx.scale(scaleX, scaleY);
          ctx.drawImage(img, -img.width/2, -img.height/2);
          ctx.restore();
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let gy = 0; gy < this.h; gy++) {
            for (let gx = 0; gx < this.w; gx++) {
              const sx = this._gridToScratchX(gx);
              const sy = this._gridToScratchY(gy);
              const px = Math.floor(sx + this.STAGE_W/2);
              const py = Math.floor(this.STAGE_H/2 - sy);
              if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
                const idx = (py * canvas.width + px) * 4 + 3;
                if (data[idx] > 128) this.grid[gy][gx] = 1;
              }
            }
          }
          this._draw();
        } finally {
          if (url) URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.error('放置角色障碍物失败：', e);
      }
    }

    setRules(args) {
      this.diag = args.DIAG === '允许';
      this.corner = args.COR === '允许';
    }

    findPath(args) {
      const algo = args.ALG;
      if (!this.grid || this.sx < 0 || this.ex < 0) {
        this._clr(); this._draw(); return Promise.resolve();
      }
      if (this.grid[this.sy][this.sx] === 1 || this.grid[this.ey][this.ex] === 1) {
        this._clr(); this._draw(); return Promise.resolve();
      }
      return new Promise(resolve => {
        this._pendingResolve = resolve;
        this._worker.postMessage({
          grid: this.grid,
          w: this.w, h: this.h,
          sx: this.sx, sy: this.sy,
          ex: this.ex, ey: this.ey,
          diag: this.diag, corner: this.corner,
          algo: algo
        });
      });
    }

    getLen() { return this.pathLen; }
    getStr() { return this.pathStr; }
    getPt(args) {
      const i = Math.floor(Number(args.IDX));
      if (i >= 0 && i < this.path.length) {
        return args.AX === 'X' ? this.path[i].x : this.path[i].y;
      }
      return 0;
    }
    getTime() { return this._lastTime; }

    getObstacleList() {
      if (!this.grid) return '';
      const points = [];
      for (let r = 0; r < this.h; r++) {
        for (let c = 0; c < this.w; c++) {
          if (this.grid[r][c] === 1) {
            points.push(this._gridToScratchX(c) + ',' + this._gridToScratchY(r));
          }
        }
      }
      return points.join(';');
    }

    getObstacleSVG() {
      if (!this.grid || this.w <= 0 || this.h <= 0) return '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"></svg>';
      const cellW = this.STAGE_W / this.w;
      const cellH = this.STAGE_H / this.h;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.STAGE_W}" height="${this.STAGE_H}" viewBox="0 0 ${this.STAGE_W} ${this.STAGE_H}">`;
      svg += `<rect width="${this.STAGE_W}" height="${this.STAGE_H}" fill="#fff"/>`;
      for (let r = 0; r < this.h; r++) {
        for (let c = 0; c < this.w; c++) {
          if (this.grid[r][c] === 1) {
            svg += `<rect x="${c * cellW}" y="${r * cellH}" width="${cellW}" height="${cellH}" fill="#555"/>`;
          }
        }
      }
      svg += '</svg>';
      return svg;
    }

    showWin() { if (this.dWin) this.dWin.style.display = ''; }
    hideWin() { if (this.dWin) this.dWin.style.display = 'none'; }

    _mkDbg() {
      if (this.dWin) return;
      const w = document.createElement('div');
      w.style.cssText = 'position:fixed;z-index:9999;border:2px solid #333;background:#fff;box-shadow:2px 2px 8px rgba(0,0,0,.3);user-select:none;';
      const t = document.createElement('div');
      t.textContent = '寻路调试 (拖动移动)';
      t.style.cssText = 'padding:6px 10px;cursor:move;background:#4a6ea9;color:#fff;font-family:sans-serif;font-size:14px;';
      const c = document.createElement('canvas');
      c.style.cssText = 'display:block;cursor:crosshair;';
      this.dCvs = c; this.dCtx = c.getContext('2d');
      w.appendChild(t); w.appendChild(c);
      t.addEventListener('mousedown', e => {
        this.dragW = true;
        this.dOffX = e.clientX - w.offsetLeft;
        this.dOffY = e.clientY - w.offsetTop;
        e.preventDefault();
      });
      window.addEventListener('mousemove', e => {
        if (!this.dragW) return;
        let l = e.clientX - this.dOffX, t2 = e.clientY - this.dOffY;
        l = Math.max(0, Math.min(l, window.innerWidth - 100));
        t2 = Math.max(0, Math.min(t2, window.innerHeight - 50));
        w.style.left = l + 'px'; w.style.top = t2 + 'px';
      });
      window.addEventListener('mouseup', () => this.dragW = false);
      c.addEventListener('mousedown', e => { this._hMouse(e, true); e.preventDefault(); });
      c.addEventListener('mousemove', e => { if (e.buttons === 1 || e.buttons === 2) this._hMouse(e, false); });
      c.addEventListener('contextmenu', e => e.preventDefault());
      document.body.appendChild(w);
      this.dWin = w;
      w.style.left = Math.max(0, (window.innerWidth - 400) / 2) + 'px';
      w.style.top = Math.max(0, (window.innerHeight - 300) / 2) + 'px';
      this._draw();
    }

    _hMouse(e, dn) {
      if (!this.grid) return;
      const rect = this.dCvs.getBoundingClientRect();
      const sx = this.dCvs.width / rect.width, sy = this.dCvs.height / rect.height;
      const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;
      const col = Math.floor(mx / this.cSize), row = Math.floor(my / this.cSize);
      if (!this._ok(col, row)) return;
      if (dn) {
        this.drawG = true;
        this.addMode = !(e.button === 2 || e.shiftKey);
        this.lCX = col; this.lCY = row;
      } else {
        if (!this.drawG) return;
        if (col === this.lCX && row === this.lCY) return;
        this.lCX = col; this.lCY = row;
      }
      this.grid[row][col] = this.addMode ? 1 : 0;
      this._draw();
    }

    _draw() {
      const cv = this.dCvs, ctx = this.dCtx;
      if (!cv || !ctx || !this.grid) { if (cv) { cv.width = 1; cv.height = 1; } return; }
      const max = 600;
      this.cSize = Math.min(30, Math.floor(Math.min(max / this.w, max / this.h)));
      const w = this.w * this.cSize, h = this.h * this.cSize;
      cv.width = w; cv.height = h;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
      for (let i = 0; i <= this.w; i++) { ctx.beginPath(); ctx.moveTo(i * this.cSize, 0); ctx.lineTo(i * this.cSize, h); ctx.stroke(); }
      for (let j = 0; j <= this.h; j++) { ctx.beginPath(); ctx.moveTo(0, j * this.cSize); ctx.lineTo(w, j * this.cSize); ctx.stroke(); }
      ctx.fillStyle = '#555';
      for (let r = 0; r < this.h; r++) {
        for (let c = 0; c < this.w; c++) {
          if (this.grid[r][c] === 1) ctx.fillRect(c * this.cSize + 1, r * this.cSize + 1, this.cSize - 2, this.cSize - 2);
        }
      }
      if (this.sx >= 0 && this.sy >= 0) {
        ctx.fillStyle = '#4CAF50'; ctx.fillRect(this.sx * this.cSize + 2, this.sy * this.cSize + 2, this.cSize - 4, this.cSize - 4);
      }
      if (this.ex >= 0 && this.ey >= 0) {
        ctx.fillStyle = '#F44336'; ctx.fillRect(this.ex * this.cSize + 2, this.ey * this.cSize + 2, this.cSize - 4, this.cSize - 4);
      }
      if (this.path.length > 1) {
        ctx.strokeStyle = '#2196F3'; ctx.lineWidth = Math.max(2, this.cSize * .3);
        ctx.beginPath();
        const toCanvasX = (sx) => (sx + this.STAGE_W/2) / this.STAGE_W * w;
        const toCanvasY = (sy) => (this.STAGE_H/2 - sy) / this.STAGE_H * h;
        const f = this.path[0];
        ctx.moveTo(toCanvasX(f.x), toCanvasY(f.y));
        for (let i = 1; i < this.path.length; i++) {
          const p = this.path[i];
          ctx.lineTo(toCanvasX(p.x), toCanvasY(p.y));
        }
        ctx.stroke();
      }
    }

    _clr() { this.path = []; this.pathStr = ''; this.pathLen = 0; }

    _getImageAssetType(storage, dataFormat) {
      const types = storage && storage.AssetType;
      if (!types) return null;
      const candidates = dataFormat === 'svg'
        ? [types.ImageVector, types.SVG, types.Vector, types.ImageBitmap]
        : [types.ImageBitmap, types.Bitmap, types.Image];
      return candidates.find(type => type && type.runtimeFormat) || null;
    }
  }

  const runtime = Scratch.vm ? Scratch.vm.runtime : Scratch.runtime;
  Scratch.extensions.register(new PathfindingExtension(runtime));
})(Scratch);