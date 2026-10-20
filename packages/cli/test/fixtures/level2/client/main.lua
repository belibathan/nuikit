local menu = NUI.surface('menu', { layer = 'panel', escape = 'close', hides = { 'hud' } })

RegisterCommand('menu', function() menu:toggle({ title = 'Menu' }) end)
