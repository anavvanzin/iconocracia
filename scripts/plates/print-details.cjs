// Reference-inspired engraved shadows: bounded patches keep paper highlights open.
const regions = [
  [
    'M248 372 Q400 270 550 371 Q400 311 248 372Z',
    'M257 394 Q400 483 546 400 Q401 440 257 394Z',
    'M347 354 A58 58 0 0 1 451 352 L430 367 A33 33 0 0 0 371 367Z',
  ],
  [
    'M334 269 C335 216 404 185 466 190 L460 221 C414 207 370 231 350 270Z',
    'M411 290 C431 279 456 294 465 320 L455 426 L415 446 C437 389 423 342 411 290Z',
    'M337 419 Q354 453 384 451 L396 481 L426 455 L438 517 L462 547 L396 539 L391 495Z',
    'M348 309 Q378 298 400 327 L412 387 Q387 366 367 366Z',
  ],
  [
    'M283 551 L283 360 A117 117 0 0 1 517 360 L517 551 L506 551 L506 360 A106 106 0 0 0 294 360 L294 551Z',
    'M277 548 L315 548 L315 561 L277 561Z M486 548 L524 548 L524 561 L486 561Z',
  ],
  [
    'M328 198 Q354 183 377 205 L365 214 Q346 204 327 226Z',
    'M342 239 Q355 253 375 239 L368 258 L352 263Z',
    'M307 288 Q310 318 330 326 L316 331 Q302 318 307 288Z',
    'M347 294 Q350 315 370 275 L376 296 Q366 325 351 331 L342 324Z',
    'M315 347 Q324 372 316 397 L302 400 Q309 376 315 347Z',
    'M362 347 Q392 382 400 414 L383 408 Q379 378 362 347Z',
    'M312 415 C309 462 337 513 338 550 L335 571 L322 577 C334 541 313 494 306 469Z',
    'M338 424 C347 469 386 507 399 547 L395 574 L380 579 C388 543 365 509 350 486Z',
    'M373 432 C400 473 449 486 475 524 L479 539 L464 542 C450 511 414 502 392 477Z',
    'M390 282 Q436 306 480 323 Q528 342 570 314 L574 322 Q531 354 476 335 Q425 316 390 282Z',
    'M407 324 Q449 365 488 375 L541 369 L532 382 Q492 391 456 364Z',
    'M426 379 Q465 400 482 426 Q493 439 489 451 L479 447 Q477 419 445 400Z',
    'M295 343 Q289 367 258 389 L250 398 Q288 382 307 352Z',
  ],
  [
    'M377 242 Q398 220 422 243 L416 251 Q394 238 377 259Z',
    'M414 270 L416 290 L403 303 L390 292 L386 282Z',
    'M367 318 Q366 361 387 385 L374 397 Q357 367 367 318Z',
    'M429 311 Q434 353 415 389 L404 399 Q419 355 429 311Z',
    'M373 422 Q363 470 378 529 L373 580 L359 580 Q365 535 359 504Z',
    'M409 426 Q435 485 440 547 L441 580 L425 580 Q429 529 409 479Z',
  ],
];

module.exports = function printDetails(index, ink) {
  const id = `etched-shadows-${index}`;
  let s = `<defs><clipPath id="${id}">${regions[index].map(d => `<path d="${d}"/>`).join('')}</clipPath></defs><g clip-path="url(#${id})" fill="none" stroke="${ink}" stroke-linecap="round">`;
  // Two directional families build tone like an old etched printing plate.
  for (let y = 178; y < 610; y += 3.2) {
    s += `<path d="M210 ${y.toFixed(2)} Q390 ${(y + 16).toFixed(2)} 610 ${(y - 37).toFixed(2)}" stroke-width=".95" opacity=".86"/>`;
  }
  for (let x = 205; x < 614; x += 5.5) {
    s += `<path d="M${x.toFixed(2)} 180 Q${(x - 21).toFixed(2)} 390 ${(x + 28).toFixed(2)} 610" stroke-width=".6" opacity=".55"/>`;
  }
  s += '</g>';
  // Sparse measuring lines and concentric atlas marks around the specimen.
  s += `<g fill="none" stroke="${ink}" stroke-width=".7" opacity=".48"><path d="M174 202h22 M185 191v22 M609 571h22 M620 560v22 M178 250v276 M171 250h14 M171 526h14 M236 622h320 M236 617v10 M556 617v10"/>`;
  for (let y = 266; y < 521; y += 13) s += `<path d="M178 ${y}h${y % 2 ? 7 : 4}"/>`;
  s += '<circle cx="622" cy="213" r="11"/><circle cx="622" cy="213" r="5"/><path d="M604 213h36 M622 195v36 M601 213h-31l-13 14 M205 613l-20 9h-20"/></g>';
  return s;
};