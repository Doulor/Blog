<script>
import { onMount, onDestroy } from 'svelte';

export let thoughts = [];
export let emptyText = '';
export let hintText = '';
export let contextLabel = '';
export let dateLabel = '';

let world;
let scrollZ = 0;
let selected = null;
let hoveredId = -1;
let touchY = null;

const N = thoughts.length;
const FOCAL = 600;        // focal length — controls perspective strength
const TUNNEL = 6000;      // depth of one cycle
const MAX_Z = 500;        // items past this z (behind camera) wrap

// Scatter in 3D
const base = thoughts.map((t, i) => {
  const x = (Math.random() - 0.5) * 1400;
  const y = (Math.random() - 0.5) * 900;
  const z = -200 - (i / N) * TUNNEL + (Math.random() - 0.5) * (TUNNEL / N) * 0.4;
  return {
    ...t, id: i, x, y, z,
    fontBase: 0.72 + Math.random() * 0.5,
  };
});

let items = [];

function recalc() {
  items = base.map(t => {
    const ez = t.z + scrollZ;
    // Behind camera or too far → hide
    if (ez > MAX_Z || ez < -TUNNEL - 600) return null;

    // Perspective projection
    const denom = FOCAL + ez;
    if (denom <= 10) return null; // too close, skip
    const scale = FOCAL / denom;
    const sx = t.x * scale; // screen x offset from center
    const sy = t.y * scale; // screen y offset from center
    // Clamp to viewport area
    if (Math.abs(sx) > 900 || Math.abs(sy) > 700) return null;

    // Opacity: fade at far end, fade when passing camera
    let opacity = 1;
    if (ez < -TUNNEL + 600) opacity = Math.max(0.08, (ez + TUNNEL) / 600);
    if (ez > 200) opacity = Math.max(0.05, 1 - (ez - 200) / (MAX_Z - 200));

    // Blur: far = blurry
    const blur = ez < -3000 ? Math.min(3, (-ez - 3000) / 1500 * 3) : 0;

    return { ...t, ez, scale, sx, sy, opacity: Math.max(0, Math.min(1, opacity)), blur };
  }).filter(Boolean);
}

recalc();

function wrapItems() {
  for (const t of base) {
    const ez = t.z + scrollZ;
    if (ez > MAX_Z + 50) t.z -= TUNNEL;
    else if (ez < -TUNNEL - 700) t.z += TUNNEL;
  }
}

function onWheel(e) {
  if (selected) return;
  e.preventDefault();
  scrollZ += e.deltaY * 1.5;
  wrapItems();
  recalc();
}

function onTouchStart(e) { touchY = e.touches[0].clientY; }
function onTouchMove(e) {
  if (selected || touchY === null) return;
  e.preventDefault();
  const y = e.touches[0].clientY;
  scrollZ += (touchY - y) * 3;
  touchY = y;
  wrapItems();
  recalc();
}
function onTouchEnd() { touchY = null; }

function pick(item) { selected = item; }
function close() { selected = null; }
function onKey(e) { if (e.key === 'Escape') close(); }

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' }); }
  catch { return ''; }
}

const particles = Array.from({ length: 50 }, () => ({
  x: Math.random() * 100, y: Math.random() * 100,
  delay: Math.random() * 16, dur: 10 + Math.random() * 16,
  size: 1 + Math.random() * 2.5, alpha: 0.04 + Math.random() * 0.1,
}));

onMount(() => {
  if (world) {
    world.addEventListener('wheel', onWheel, { passive: false });
    world.addEventListener('touchstart', onTouchStart, { passive: true });
    world.addEventListener('touchmove', onTouchMove, { passive: false });
    world.addEventListener('touchend', onTouchEnd, { passive: true });
  }
  window.addEventListener('keydown', onKey);
});

onDestroy(() => {
  if (world) {
    world.removeEventListener('wheel', onWheel);
    world.removeEventListener('touchstart', onTouchStart);
    world.removeEventListener('touchmove', onTouchMove);
    world.removeEventListener('touchend', onTouchEnd);
  }
  window.removeEventListener('keydown', onKey);
});
</script>

{#if N === 0}
  <div class="empty-state">
    <div class="empty-icon">✦</div>
    <p>{emptyText}</p>
  </div>
{:else}
  <div class="world" bind:this={world}>
    <div class="bg-particles" aria-hidden="true">
      {#each particles as p}
        <div class="dot" style="
          left:{p.x}%;top:{p.y}%;
          width:{p.size}px;height:{p.size}px;
          opacity:{p.alpha};
          animation-delay:{p.delay}s;animation-duration:{p.dur}s;
        "></div>
      {/each}
    </div>
    <div class="glow g1" aria-hidden="true"></div>
    <div class="glow g2" aria-hidden="true"></div>

    {#each items as item (item.id)}
      <span
        class="t"
        class:hov={hoveredId === item.id}
        style="
          left:calc(50% + {item.sx}px);
          top:calc(50% + {item.sy}px);
          transform:translate(-50%,-50%) scale({item.scale});
          font-size:{item.fontBase}rem;
          opacity:{item.opacity};
          filter:blur({item.blur}px);
          z-index:{Math.round(item.scale * 1000)};
        "
        on:mouseenter={() => hoveredId = item.id}
        on:mouseleave={() => hoveredId = -1}
        on:click|stopPropagation={() => pick(item)}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && pick(item)}
      >{item.content}</span>
    {/each}

    <div class="hint" aria-hidden="true">
      <span class="hint-arrow">⤳</span> {hintText}
    </div>
  </div>

  {#if selected}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="overlay" on:click|self={close}>
      <div class="backdrop" on:click={close} aria-hidden="true"></div>
      <div class="panel" role="dialog" aria-modal="true">
        <button class="panel-close" on:click={close} aria-label="关闭">&times;</button>
        <div class="panel-quote" aria-hidden="true">&ldquo;</div>
        <p class="panel-text">{selected.content}</p>
        <div class="panel-meta">
          {#if selected.date}
            <div class="meta-row"><span class="mi">📅</span><span class="ml">{dateLabel}</span><span class="mv">{fmtDate(selected.date)}</span></div>
          {/if}
          {#if selected.context}
            <div class="meta-row"><span class="mi">💭</span><span class="ml">{contextLabel}</span><span class="mv">{selected.context}</span></div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .world {
    position: relative;
    width: 100%;
    height: 85vh;
    min-height: 520px;
    overflow: hidden;
    background:
      radial-gradient(ellipse at 30% 40%, rgba(218,165,32,0.04) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 60%, rgba(255,200,50,0.03) 0%, transparent 45%),
      var(--card-bg);
  }

  /* Thought text — bare text, JS-calculated position */
  .t {
    position: absolute;
    white-space: nowrap;
    cursor: pointer;
    font-weight: 500;
    color: var(--text-primary, rgba(0,0,0,0.85));
    text-shadow: 0 1px 3px rgba(0,0,0,0.08);
    pointer-events: auto;
    user-select: none;
    line-height: 1.5;
    will-change: transform, opacity, filter;
    transition: text-shadow 0.3s ease, color 0.3s ease;
  }

  .t:hover, .t.hov {
    text-shadow:
      0 0 22px rgba(218,165,32,0.65),
      0 0 55px rgba(218,165,32,0.2),
      0 0 4px rgba(218,165,32,0.9);
    color: #b8860b;
  }

  :root.dark .t {
    text-shadow: 0 1px 5px rgba(0,0,0,0.4);
  }
  :root.dark .t:hover,
  :root.dark .t.hov {
    color: #e6b422;
    text-shadow:
      0 0 22px rgba(230,180,34,0.55),
      0 0 55px rgba(230,180,34,0.18),
      0 0 4px rgba(230,180,34,0.8);
  }

  /* Particles */
  .bg-particles { position:absolute;inset:0;pointer-events:none;z-index:0; }
  .dot {
    position:absolute;border-radius:50%;
    background:radial-gradient(circle, rgba(218,165,32,0.6) 0%, transparent 70%);
    animation:drift linear infinite;
  }
  @keyframes drift {
    0%,100%{transform:translate(0,0) scale(1);}
    25%{transform:translate(14px,-20px) scale(1.2);}
    50%{transform:translate(-10px,-35px) scale(0.8);}
    75%{transform:translate(18px,-14px) scale(1.1);}
  }

  .glow{position:absolute;border-radius:50%;pointer-events:none;z-index:0;filter:blur(90px);animation:breathe 10s ease-in-out infinite;}
  .g1{width:350px;height:350px;top:15%;left:10%;background:rgba(218,165,32,0.05);}
  .g2{width:280px;height:280px;bottom:20%;right:15%;background:rgba(255,200,50,0.04);animation-delay:-5s;}
  @keyframes breathe{0%,100%{opacity:0.4;transform:scale(1);}50%{opacity:1;transform:scale(1.12);}}

  .hint{
    position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);
    padding:0.4rem 1.2rem;border-radius:999px;
    background:color-mix(in srgb, var(--card-bg) 75%, transparent);
    border:1px solid color-mix(in srgb, var(--line-divider) 20%, transparent);
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    color:var(--text-muted,rgba(0,0,0,0.4));font-size:0.78rem;
    z-index:10;pointer-events:none;white-space:nowrap;
    animation:hint-pulse 4s ease-in-out infinite;
  }
  .hint-arrow{opacity:0.6;margin-right:0.2em;}
  @keyframes hint-pulse{0%,100%{opacity:0.45;}50%{opacity:0.85;}}

  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;gap:1rem;color:var(--text-muted,rgba(0,0,0,0.35));}
  .empty-icon{font-size:3rem;opacity:0.3;animation:e-pulse 3s ease-in-out infinite;}
  @keyframes e-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1) rotate(8deg);}}

  .overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;animation:o-in 0.25s ease;}
  .backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
  @keyframes o-in{from{opacity:0;}to{opacity:1;}}
  .panel{
    position:relative;max-width:460px;width:90%;padding:2.5rem 2rem 2rem;border-radius:20px;
    background:color-mix(in srgb, var(--card-bg) 93%, transparent);
    border:1px solid color-mix(in srgb, var(--line-divider) 35%, transparent);
    backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
    box-shadow:0 12px 60px rgba(0,0,0,0.18),0 0 50px rgba(218,165,32,0.06);
    animation:p-in 0.45s cubic-bezier(0.34,1.56,0.64,1);text-align:center;overflow:hidden;
  }
  @keyframes p-in{from{opacity:0;transform:scale(0.6) translateY(30px);}to{opacity:1;transform:scale(1) translateY(0);}}
  .panel-quote{position:absolute;top:-0.15em;left:0.3em;font-size:5.5rem;font-family:Georgia,serif;color:rgba(218,165,32,0.08);line-height:1;pointer-events:none;}
  .panel-close{
    position:absolute;top:0.6rem;right:0.8rem;width:2rem;height:2rem;border:none;background:none;
    color:var(--text-muted,rgba(0,0,0,0.3));font-size:1.5rem;cursor:pointer;border-radius:50%;
    display:flex;align-items:center;justify-content:center;transition:background 0.2s,color 0.2s;z-index:1;
  }
  .panel-close:hover{background:color-mix(in srgb, var(--text-primary) 8%, transparent);color:var(--text-primary);}
  .panel-text{font-size:1.4rem;font-weight:600;line-height:1.9;color:var(--text-primary,rgba(0,0,0,0.85));word-break:break-word;margin-bottom:1.5rem;position:relative;}
  .panel-meta{display:flex;flex-direction:column;gap:0.5rem;padding-top:1.1rem;border-top:1px solid color-mix(in srgb, var(--line-divider) 30%, transparent);text-align:left;}
  .meta-row{display:flex;align-items:center;gap:0.4rem;font-size:0.88rem;}
  .mi{font-size:0.95rem;flex-shrink:0;width:1.5em;text-align:center;}
  .ml{color:var(--text-muted,rgba(0,0,0,0.38));flex-shrink:0;}
  .mv{color:var(--text-primary,rgba(0,0,0,0.68));}

  @media(prefers-reduced-motion:reduce){
    .t,.panel,.overlay,.glow{animation:none!important;transition:none!important;}
    .dot{animation:none!important;}
    .hint{animation:none!important;opacity:0.7;}
  }
  @media(max-width:640px){
    .world{height:68vh;min-height:420px;}
    .panel{padding:2rem 1.5rem 1.5rem;max-width:92%;}
    .panel-text{font-size:1.15rem;}
    .hint{font-size:0.7rem;bottom:1rem;}
  }
</style>
