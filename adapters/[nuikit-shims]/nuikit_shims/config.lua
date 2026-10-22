-- Export shims: each entry turns `exports[resource]:export(...)` into one nuikit intent.
-- Reference and worked examples: docs/adapters/shims.md. Every `resource` needs a `provide` line in fxmanifest.lua.
ShimConfig = {
  {
    resource = 'my_notify', export = 'Notify', intent = 'notify',
    args = { 'description', 'status', 'duration' },        -- Notify(msg, type, ms)
    map = { status = { inform = 'info', err = 'error' } }, -- old value -> nuikit value, per prop
    defaults = { title = 'Server' },
  },
  {
    resource = 'my_menu', export = 'AskAmount', intent = 'input',
    transform = function(title, label)                    -- the escape hatch: any args -> props
      return { title = title, fields = { { id = 'amount', type = 'number', label = label or 'Amount', required = true } } }
    end,
    result = function(r) return r and r.byId.amount or nil end, -- what the old export returned
  },
}
