# nuikit_screen

Interactive screens in the world: a laptop, a terminal, a wall display, drawn by a web page (any
nuikit page) in a DUI. **Spike: not seen in game yet.**

```lua
local id = exports.nuikit_screen:create({
  coords = vec3(441.2, -978.9, 30.9), heading = 90.0, tilt = 10.0,  -- where it stands, which way it faces
  width = 0.34, height = 0.21,                                      -- metres
  url = 'nui://my_resource/web/dist/index.html', resolution = { 1920, 1080 },
  label = 'Use the laptop',
})
exports.nuikit_screen:send(id, 'myAction', { … })  -- a window message in the page (like SendNUIMessage)
exports.nuikit_screen:remove(id)
```

- The page is drawn as a textured quad where the screen stands (`DrawSpritePoly`), so it needs no prop and
  no model render target; put it on a prop's screen by its coords and heading.
- Near one (`Config.useDistance`), **E** uses it: the game's cursor drives the page (a ray from the camera
  through the cursor meets the screen; the hit becomes DUI mouse moves, clicks and wheel). **Esc**, **Backspace**
  or **E** lets go. While in use a modal surface keeps the pause menu and other modals away; no NUI focus.
- Screens draw only within `Config.drawDistance`; the loop sleeps otherwise.
- `/nuikit_screen` puts a demo terminal in front of you (`Config.demo = false` removes the command).

Unproven: the quad's facing and winding on DrawSpritePoly, DUI mouse coordinates, keyboard input (not sent yet).

Made by [@belibathan](https://github.com/belibathan).
