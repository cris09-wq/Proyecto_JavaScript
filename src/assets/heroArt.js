// Ilustración original del hero: una olla humeante rodeada de platos típicos.
export const HERO_SVG = `<svg class="art" viewBox="0 0 520 410" role="img" aria-label="Olla humeante rodeada de platos típicos">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d5f0f7"/><stop offset="1" stop-color="#f3fbfd"/></linearGradient>
    <linearGradient id="sand1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecd7a6"/><stop offset="1" stop-color="#dcc088"/></linearGradient>
  </defs>
  <ellipse cx="290" cy="170" rx="225" ry="160" fill="url(#sky)"/>
  <path d="M30 60 Q 260 118 500 52" fill="none" stroke="#6b5a3a" stroke-width="2.5"/>
  <g>
    <path d="M70 72 l 22 8 l -14 22 z" fill="#fcd116"/><path d="M130 84 l 22 4 l -10 24 z" fill="#1f5fbf"/>
    <path d="M195 94 l 22 0 l -8 24 z" fill="#ce1126"/><path d="M262 98 l 22 -2 l -6 24 z" fill="#fcd116"/>
    <path d="M330 94 l 22 -5 l -4 24 z" fill="#1f5fbf"/><path d="M396 84 l 22 -8 l 0 24 z" fill="#ce1126"/>
    <path d="M455 70 l 20 -10 l 4 24 z" fill="#fcd116"/>
  </g>
  <path d="M10 410 C 80 310, 270 280, 520 310 L520 410 Z" fill="url(#sand1)"/>
  <path d="M130 410 C 210 345, 340 335, 520 360 L520 410 Z" fill="#d3b676"/>
  <!-- hojas de plátano -->
  <path d="M255 235 C 195 170, 140 190, 108 128 C 190 138, 245 180, 272 232 Z" fill="#2f8f3e"/>
  <path d="M285 232 C 300 160, 350 130, 372 82 C 392 150, 340 200, 300 236 Z" fill="#3aa84c"/>
  <path d="M310 240 C 380 190, 430 205, 470 160 C 450 230, 380 262, 320 252 Z" fill="#287a35"/>
  <path d="M255 235 C 215 190, 185 175, 150 150" stroke="#1f6a2c" stroke-width="3" fill="none"/>
  <!-- olla -->
  <path d="M150 238 H 392 C 398 306, 362 350, 271 350 C 180 350, 144 306, 150 238 Z" fill="#cf2f2f"/>
  <rect x="148" y="256" width="246" height="22" fill="#fcd116"/>
  <rect x="149" y="278" width="244" height="14" fill="#1f5fbf"/>
  <path d="M175 300 C 190 330, 230 342, 250 342" stroke="#ffffff55" stroke-width="7" fill="none" stroke-linecap="round"/>
  <ellipse cx="271" cy="236" rx="132" ry="18" fill="#8f1d1d"/>
  <ellipse cx="271" cy="234" rx="120" ry="12" fill="#e9a63a"/>
  <circle cx="225" cy="232" r="7" fill="#f7dc7a"/><circle cx="262" cy="229" r="9" fill="#f4d160"/><circle cx="305" cy="233" r="7" fill="#f7dc7a"/>
  <rect x="240" y="226" width="30" height="9" rx="4" fill="#f2b73d" transform="rotate(-12 255 230)"/>
  <path d="M142 250 q -36 4 -36 24 q 0 14 38 16" fill="none" stroke="#2a2a35" stroke-width="9" stroke-linecap="round"/>
  <path d="M400 250 q 36 4 36 24 q 0 14 -38 16" fill="none" stroke="#2a2a35" stroke-width="9" stroke-linecap="round"/>
  <!-- vapor -->
  <path d="M225 210 C 205 180, 245 160, 225 126" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" opacity=".9"/>
  <path d="M272 206 C 252 172, 296 150, 274 112" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" opacity=".9"/>
  <path d="M320 210 C 300 182, 338 164, 320 132" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" opacity=".9"/>
  <!-- arepa -->
  <circle cx="96" cy="238" r="38" fill="#f3d58a" stroke="#b9822a" stroke-width="5"/>
  <circle cx="84" cy="226" r="9" fill="#fff6d6" opacity=".7"/>
  <path d="M70 252 q 24 18 48 -2" stroke="#d5a24a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- empanada -->
  <path d="M424 318 a 40 40 0 0 1 80 0 Z" fill="#e8a449" stroke="#a8691b" stroke-width="5" stroke-linejoin="round"/>
  <path d="M432 318 q 8 -10 16 0 q 8 -10 16 0 q 8 -10 16 0" stroke="#a8691b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- taza de café -->
  <path d="M60 330 h 60 v 12 a 30 30 0 0 1 -60 0 Z" fill="#fff" stroke="#17171f" stroke-width="4" stroke-linejoin="round"/>
  <path d="M120 336 q 20 0 18 14 q -2 12 -22 10" fill="none" stroke="#17171f" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="90" cy="331" rx="26" ry="5" fill="#6b3a1c"/>
  <path d="M82 318 q -8 -10 0 -20 M98 318 q -8 -10 0 -20" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>
  <!-- buñuelos y granos -->
  <circle cx="190" cy="372" r="15" fill="#f0c35a" stroke="#b9822a" stroke-width="4"/><circle cx="222" cy="380" r="12" fill="#f0c35a" stroke="#b9822a" stroke-width="4"/>
  <g fill="#6b3a1c" stroke="#3f200e" stroke-width="2"><ellipse cx="350" cy="370" rx="9" ry="6" transform="rotate(-25 350 370)"/><ellipse cx="372" cy="380" rx="9" ry="6" transform="rotate(20 372 380)"/><ellipse cx="392" cy="368" rx="9" ry="6" transform="rotate(-10 392 368)"/></g>
</svg>`;
