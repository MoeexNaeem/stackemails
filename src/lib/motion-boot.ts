/**
 * Inline, pre-paint: hide reveal targets only when JS runs; reveal all if the
 * controller never mounts. Lives outside the "use client" Motion module because
 * the server layout needs the string itself, not a client reference.
 */
export const REVEAL_BOOT = `document.documentElement.classList.add('m-reveal-on');setTimeout(function(){if(!window.__mMotion){document.querySelectorAll('[data-reveal]').forEach(function(e){e.classList.add('is-in')})}},3000);`;
