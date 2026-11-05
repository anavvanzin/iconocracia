// Fine engraved linework shared by all language/color editions.
function pen(ink) {
  return (d, width = 1.2, opacity = 1, color = ink) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function eye(ink, acc) {
  const p = pen(ink);
  let s = '<g id="engraved-eye">';
  // Broken radial strokes retain the generative aperture of plate I.
  for (let i = 0; i < 64; i++) {
    const a = i * Math.PI / 32;
    const point = r => `${(400 + r * Math.cos(a)).toFixed(2)} ${(380 + r * Math.sin(a)).toFixed(2)}`;
    s += p(`M${point(151)} L${point(i % 4 === 0 ? 207 : 184)}`, i % 4 === 0 ? 1.3 : .75, .6);
    if (i % 4 === 0) s += p(`M${point(216)} L${point(224)}`, .8, .4);
  }
  s += p('M239 380 C284 327 335 299 400 303 C466 305 523 338 561 380 C512 426 463 453 400 455 C337 453 283 425 239 380 Z', 2.1);
  s += p('M245 371 C286 310 351 282 409 288 C465 291 524 322 553 363 M248 391 C286 437 353 467 410 469 C465 467 512 441 546 411', 1, .8);
  s += p('M247 378 C287 341 343 319 399 322 C455 323 513 349 550 379 M252 387 C291 419 345 437 401 436 C460 435 512 411 550 384', .8, .65);
  s += `<circle cx="400" cy="380" r="67" fill="none" stroke="${ink}" stroke-width="1.8"/><circle cx="400" cy="380" r="59" fill="none" stroke="${ink}" stroke-width=".9"/><circle cx="400" cy="380" r="27" fill="none" stroke="${acc}" stroke-width="2"/>`;
  for (let i = 0; i < 76; i++) {
    const a = i * Math.PI / 38;
    const xy = (r, t) => `${(400 + r * Math.cos(t)).toFixed(2)} ${(380 + r * Math.sin(t)).toFixed(2)}`;
    s += p(`M${xy(31 + i % 5, a)} Q${xy(46, a + .05)} ${xy(57 - i % 3, a + .018)}`, .7, .8);
  }
  s += p('M391 359 C378 366 375 386 386 397 C396 409 417 404 423 390', 1, .6, acc);
  s += p('M242 380 Q250 369 263 372 M242 380 Q251 392 265 389', 1.4);
  for (let i = 0; i < 15; i++) {
    const x = 273 + i * 18, y = 306 + Math.pow((x - 400) / 33, 2);
    s += p(`M${x} ${y + 9} q-3 -8 -8 -12`, .65, .65);
  }
  s += p('M291 320 Q335 294 366 296 M436 298 Q481 310 509 331', 1.4, .7, acc);
  return s + '</g>';
}

function profile(ink, acc) {
  const p = pen(ink);
  let s = '<g id="engraved-profile">';
  s += p('M466 190 C425 181 381 192 351 225 C332 246 330 275 326 295 C322 315 310 328 295 341 C288 349 291 355 307 359 L316 361 C311 370 313 382 320 388 L316 398 C309 407 314 416 325 421 C321 441 337 459 361 460 C381 460 389 475 391 495 L391 539 L343 561 M391 539 C414 554 447 558 477 556', 2);
  s += p('M466 190 L475 225 L452 248 L478 279 L465 312 L486 337 L469 368 L489 394 L467 427 L483 452 L467 482 L478 518 L477 556', 1.3);
  s += p('M466 205 L461 221 L442 244 L462 279 L452 308 L473 335 L456 369 L474 395 L454 425 L468 454 L453 484 L463 517 L462 546', .8, .6);
  const paths = [
    'M335 282 C348 273 360 274 369 282 M334 289 C345 283 357 285 365 290 M341 291 Q348 297 359 290 M343 285 L343 292',
    'M331 300 C337 307 333 322 326 334 M309 351 Q320 347 325 353 M324 363 C335 372 339 382 336 391',
    'M319 399 C326 395 334 396 340 401 C332 404 323 407 317 406 M323 413 Q334 416 343 409',
    'M343 428 C351 444 369 447 381 439 M367 461 C390 450 410 431 415 407 M395 495 C408 480 421 459 427 444',
    'M407 296 C397 285 386 298 391 313 C393 324 403 335 410 327 C418 319 417 304 407 296 M402 302 C393 298 398 318 405 319',
    'M340 257 C352 236 371 226 390 225 M337 248 C352 222 372 208 401 209 M354 232 C369 207 396 196 421 200',
    'M369 225 C389 202 418 194 445 201 M386 227 C404 210 425 207 445 212 M401 242 C415 224 435 219 455 226',
    'M417 260 C425 243 443 239 458 248 M427 279 C439 261 448 263 466 272',
    'M379 237 C383 252 376 261 380 274 M390 233 C394 249 389 264 397 278',
    'M410 350 C427 351 439 365 442 381 M422 384 C423 405 411 426 402 439',
    'M399 505 C416 524 440 532 463 529 M352 559 C383 549 396 552 415 559',
  ];
  s += paths.map(d => p(d, 1, .9)).join('');
  for (let i = 0; i < 13; i++) {
    s += p(`M${349 + i * 3.5} ${333 + i * 3} q7 10 9 19`, .65, .45);
    s += p(`M${400 + i * 3.5} ${473 + i * 3} l-6 18`, .65, .5);
  }
  s += p('M444 301 l-8 12 8 9 -5 15 M454 418 l-10 6 5 14 M428 215 l-5 10 6 7', .8, .6);
  s += p('M319 400 Q329 397 340 401', 1.6, .9, acc);
  for (let i = 0; i < 3; i++) s += p(`M${276 - i * 24} ${384 - i * 7} q-12 17 0 ${32 + i * 14}`, 1.1, 1 - i * .25, acc);
  return s + '</g>';
}

function arches(ink, acc) {
  const p = pen(ink);
  let s = '<g id="engraved-arches">';
  // Ghost contours continue the surviving-form motif behind the masonry.
  for (let i = 4; i >= 1; i--) {
    const o = i * 20;
    s += p(`M${300 - o} 569 L${300 - o} 361 A${100 + o} ${100 + o} 0 0 1 ${500 + o} 361 L${500 + o} 569`, .95, .72 - i * .12);
    s += p(`M${307 - o} 548 L${307 - o} 361 A${93 + o} ${93 + o} 0 0 1 ${493 + o} 361`, .55, .45 - i * .07);
  }
  s += p('M283 551 L283 360 A117 117 0 0 1 517 360 L517 551 M307 551 L307 360 A93 93 0 0 1 493 360 L493 551', 1.8);
  s += p('M277 360 L314 360 L314 372 L277 372 Z M486 360 L523 360 L523 372 L486 372 Z M276 548 L315 548 L315 561 L276 561 Z M485 548 L524 548 L524 561 L485 561 Z', 1.2);
  s += p('M300 360 A100 100 0 0 1 500 360', 1.8, .95, acc);
  for (let i = 0; i <= 11; i++) {
    const a = Math.PI + i * Math.PI / 11;
    const xy = r => `${(400 + r * Math.cos(a)).toFixed(2)} ${(360 + r * Math.sin(a)).toFixed(2)}`;
    s += p(`M${xy(94)} L${xy(116)}`, 1, .85);
    if (i < 11) {
      const b = a + .075;
      s += p(`M${(400 + 106 * Math.cos(b)).toFixed(2)} ${(360 + 106 * Math.sin(b)).toFixed(2)} l3 -3`, .6, .55);
    }
  }
  for (const x of [290, 296, 303, 498, 505, 512]) s += p(`M${x} 381 L${x} 540`, .65, .65);
  s += p('M284 413 l9 -4 6 7 -3 9 M510 468 l-8 9 3 16 M355 267 l5 7 -4 8 M443 278 l-4 9 5 5', .8, .7);
  s += p('M213 570 L587 570 M244 577 L551 577 M285 584 L514 584', 1, .65);
  for (let i = 0; i < 10; i++) s += p(`M${286 + i * 2} 535 l4 -12 M${495 + i * 2} 535 l4 -12`, .55, .4);
  s += p('M392 244 L388 267 M408 244 L412 267', 1.2, .8, acc);
  return s + '</g>';
}

function shadow(ink, acc, paper) {
  const p = pen(ink);
  let s = '<g id="engraved-shadow"><defs><clipPath id="shadow-field"><path d="M205 190 L590 190 L590 580 L205 580 Z"/></clipPath></defs><g clip-path="url(#shadow-field)">';
  for (let i = -400; i < 440; i += 7) s += p(`M${205 + i} 580 L${595 + i} 190`, .7, .48);
  for (let i = -200; i < 390; i += 13) s += p(`M205 ${190 + i} L590 ${575 + i}`, .55, .21);
  s += '</g>';
  const silhouette = 'M378 277 C367 266 370 245 380 235 C391 222 416 226 425 240 C433 250 432 267 423 278 L417 295 C440 300 454 315 455 337 L463 399 L452 420 C460 457 472 507 479 580 L330 580 C340 532 339 490 347 453 L355 410 L343 392 L352 335 C355 312 361 303 384 295 Z';
  s += `<path d="${silhouette}" fill="${paper}"/>`;
  s += p(silhouette, 1.2, .75);
  const folds = [
    'M378 277 C387 284 402 287 417 276 M384 285 L384 297 L398 310 L417 295',
    'M377 245 C389 231 409 236 420 247 M373 257 C382 249 399 251 411 245 M379 240 C391 234 411 236 419 242',
    'M405 256 Q411 252 416 256 M413 258 L418 265 L412 268 M407 275 Q413 277 417 273',
    'M367 312 C367 345 386 359 393 373 C407 359 420 333 429 308 M363 318 C356 344 358 372 356 392 M442 320 C441 350 450 385 450 400',
    'M356 402 C380 394 418 399 449 408 M356 410 C385 405 420 410 447 417',
    'M362 420 C350 459 355 508 345 572 M373 419 C366 464 382 516 373 580 M387 421 C390 465 409 519 404 580',
    'M400 422 C410 463 435 514 438 580 M416 425 C435 464 452 518 460 580 M431 426 C442 449 449 469 455 489',
    'M359 335 C359 357 351 378 349 389 L360 401 M449 346 L457 389 L447 410',
    'M371 428 C365 456 369 480 373 495 M393 448 C398 475 409 498 414 517 M420 463 C434 497 441 525 444 547',
  ];
  s += folds.map(d => p(d, .9, .8)).join('');
  for (let i = 0; i < 9; i++) s += p(`M${366 + i * 7} ${320 + i % 3 * 5} Q${376 + i * 6} 364 ${371 + i * 8} 395`, .65, .55);
  // A partial offset outline makes the image a surviving spectral fragment.
  s += p('M439 238 C451 252 446 276 437 287 M472 317 C481 342 478 373 485 402 M472 449 C482 487 490 529 497 563', .8, .4);
  s += p('M378 277 C368 261 372 242 385 233 M417 295 C438 301 450 310 453 329 M356 402 Q386 394 410 403', 1.6, .8, acc);
  s += p('M205 214 L205 190 L239 190 M557 190 L590 190 L590 223 M205 547 L205 580 L237 580 M558 580 L590 580 L590 547', 1.3, .8);
  s += p('M208 225 L208 530 M587 241 L587 514', .7, .45);
  return s + '</g>';
}

// Fine antique engraving: retain delicate shadows against firmer contour lines.
function woodcut(svg, ink) {
  const bold = svg.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w * (+w >= 1.2 ? 1.4 : 1)).toFixed(2)}"`);
  return `<defs><filter id="litho" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale=".65"/></filter></defs><g filter="url(#litho)" stroke-linecap="square">${bold}</g>`;
}

module.exports = { eye, profile, arches, shadow, woodcut };