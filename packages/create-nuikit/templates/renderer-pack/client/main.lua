-- {{name}}: client. A renderer pack needs no Lua: nuikit finds `nuikit_renderer` in the fxmanifest
-- and loads web/dist/renderers.js into its frame. This file only adds a test command.

RegisterCommand('{{name}}_test', function()
  nk.notify({ title = 'Paid', description = '$500 from Los Santos Customs', status = 'success' })
  nk.notify({ title = 'Low fuel', description = 'Find a station', status = 'warning', duration = 8000 })
  nk.notify({ title = 'Call failed', status = 'error', icon = 'phone', position = 'bottom-right' })
end, false)
