-- The fivem-foundation helpers every template loads (helpers/*.lua): what each one guarantees.
-- Run by helpers.test.ts.
RESOURCE_STATE = 'started'
PRINTED = {}
function print(m) PRINTED[#PRINTED + 1] = tostring(m) end
function GetCurrentResourceName() return 'demo' end
function GetResourceState() return RESOURCE_STATE end
local clock = 0
function GetGameTimer() return clock end
function Wait(ms) clock = clock + ms end
NAMES = { 'Alex', 'Riley', 'Sam' }
function GetPlayerName(id) return NAMES[id] end
-- FiveM's json (lua-rapidjson) as tested in the foundation: decode gives two values, or nil + position + message
json = {
  decode = function(s)
    if s == '{"a":1}' then return { a = 1 }, 7 end
    if s == '[]' then return {}, 2 end
    return nil, 1, 'Missing a name for object member.'
  end,
  encode = function(v) if type(v) == 'table' and v.boom then error("type 'function' is not supported by JSON") end return 'x' end,
}
Config = { debug = false }
boot()

-- Log: colour + [RESOURCE] + message + ^7
Log.info('hello')
check(PRINTED[1] == '^5[DEMO] hello^7', 'Log.info: ^5[DEMO] message^7 (' .. tostring(PRINTED[1]) .. ')')
Log.error('bad'); Log.warn('meh'); Log.success('yay')
check(PRINTED[2] == '^1[DEMO] bad^7' and PRINTED[3] == '^3[DEMO] meh^7' and PRINTED[4] == '^2[DEMO] yay^7', 'Log.error ^1, warn ^3, success ^2')
Log.debug('quiet')
check(#PRINTED == 4, 'Log.debug prints nothing without Config.debug')
Config.debug = true
Log.debug('loud')
check(PRINTED[5] == '^6[DEMO] loud^7', 'Log.debug prints ^6 with Config.debug')
local ok, err = pcall(Log.fatal, 'no config')
check(not ok and tostring(err):find('[DEMO] no config', 1, true) and PRINTED[6] == '^1[DEMO] no config^7', 'Log.fatal logs red, then errors')
check(not pcall(Log.info, 42), 'Log.info asserts a string')

-- JsonSafe: one return value, a reason on failure, encode never errors
local v, reason = JsonSafe.decode('{"a":1}')
check(type(v) == 'table' and v.a == 1 and reason == nil, 'JsonSafe.decode: the value alone (the position is dropped)')
check(select('#', JsonSafe.decode('{"a":1}')) == 1, 'JsonSafe.decode returns exactly one value on success')
v, reason = JsonSafe.decode('{bad')
check(v == nil and reason == 'Missing a name for object member.', 'JsonSafe.decode on bad JSON: nil and the parser message (' .. tostring(reason) .. ')')
v, reason = JsonSafe.decode(nil)
check(v == nil and type(reason) == 'string', 'JsonSafe.decode(nil): nil and a reason')
v, reason = JsonSafe.decode('')
check(v == nil and type(reason) == 'string', 'JsonSafe.decode(""): nil and a reason')
check(JsonSafe.isStorable({ a = 1, b = { 'x', true } }), 'isStorable: strings, numbers, booleans, nested tables')
check(not JsonSafe.isStorable({ [true] = 1 }), 'isStorable: a boolean key is not')
check(not JsonSafe.isStorable({ f = function() end }), 'isStorable: a function is not')
check(not JsonSafe.isStorable({ n = 0 / 0 }), 'isStorable: NaN is not')
check(not JsonSafe.isStorable({ n = math.huge }), 'isStorable: Infinity is not')
check(not JsonSafe.isStorable({ __cfx_functionReference = 'x' }), 'isStorable: a funcref is not')
local deep = {}
local cur = deep
for _ = 1, 20 do cur.next = {}; cur = cur.next end
check(not JsonSafe.isStorable(deep), 'isStorable: deeper than 16 is not')
local enc, why = JsonSafe.encode({ a = 1 })
check(enc == 'x' and why == nil, 'JsonSafe.encode: the string')
enc, why = JsonSafe.encode({ n = 0 / 0 })
check(enc == nil and type(why) == 'string', 'JsonSafe.encode refuses NaN before calling json')
enc, why = JsonSafe.encode({ boom = true })
check(enc == nil and why:find('not supported', 1, true), 'JsonSafe.encode: an error from json comes back as a reason, never thrown')

-- ServerId: integers 1.. only; online needs a name
check(ServerId.parse(3) == 3 and ServerId.parse(3.0) == 3, 'ServerId.parse: 3 and 3.0 are player 3')
check(ServerId.parse(3.5) == nil, 'ServerId.parse(3.5): nil (a native would read 3)')
check(ServerId.parse('3') == nil and ServerId.parse('3abc') == nil, 'ServerId.parse: strings are nil (parse tonumber(args[1]) first)')
check(ServerId.parse(0) == nil and ServerId.parse(-1) == nil, 'ServerId.parse: 0 and -1 are nil')
check(ServerId.parse(0 / 0) == nil and ServerId.parse(math.huge) == nil, 'ServerId.parse: NaN and inf are nil')
check(ServerId.parse(0x80000000) == nil, 'ServerId.parse: above 0x7FFFFFFF is nil')
check(ServerId.online(2) == 2 and ServerId.online(9) == nil and ServerId.online(2.5) == nil, 'ServerId.online: an online integer id only')

-- RateLimiter: max per sliding window, per player
local limiter = RateLimiter:new(3, 1000)
check(limiter:allow(1) and limiter:allow(1) and limiter:allow(1), 'RateLimiter: three in a window go through')
check(not limiter:allow(1), 'RateLimiter: the fourth is refused')
check(limiter:allow(2), 'RateLimiter: another player has their own window')
clock = clock + 999
check(not limiter:allow(1), 'RateLimiter: still refused at 999 ms')
clock = clock + 1
check(limiter:allow(1), 'RateLimiter: the window slides, the oldest expires at 1000 ms')
limiter:cleanup(1)
check(limiter:allow(1) and limiter:allow(1) and limiter:allow(1), 'RateLimiter.cleanup forgets the player')
check(not pcall(RateLimiter.new, RateLimiter, 0, 1000) and not pcall(limiter.allow, limiter, '1'), 'RateLimiter asserts its arguments')

-- WaitLimiter: a deadline on every wait
check(WaitLimiter.interval() == 1000 and WaitLimiter.interval(50) == 1000 and WaitLimiter.interval(2500) == 2500, 'WaitLimiter.interval: at least 1000')
local n = 0
check(WaitLimiter.waitUntil(function() n = n + 1; return n >= 3 end, { timeout = 1000, interval = 50 }), 'waitUntil: true when the condition holds')
check(n == 3, 'waitUntil polls until then (' .. n .. ')')
local before, timedOut = clock, false
check(not WaitLimiter.waitUntil(function() return false end, { timeout = 500, interval = 50, onTimeout = function() timedOut = true end }), 'waitUntil: false at the deadline')
check(timedOut and clock - before >= 500 and clock - before < 600, 'waitUntil: onTimeout ran, and it waited the timeout and no more (' .. (clock - before) .. ' ms)')
before = clock
WaitLimiter.waitUntil(function() return false end)
check(clock - before == 1000, 'waitUntil defaults: 1000 ms timeout, 1000 ms interval (' .. (clock - before) .. ' ms)')
RESOURCE_STATE = 'stopping'
before = clock
check(not WaitLimiter.waitUntil(function() return false end, { timeout = 5000 }) and clock == before, 'waitUntil stops at once when the resource is no longer started')
RESOURCE_STATE = 'started'
check(not pcall(WaitLimiter.waitUntil, 'nope'), 'waitUntil asserts a function')

-- Sanitize
check(Sanitize.trim('  a b  ') == 'a b', 'Sanitize.trim')
check(Sanitize.value('  x ', 'string', 'd') == 'x' and Sanitize.value('   ', 'string', 'd') == 'd' and Sanitize.value(nil, 'string', 'd') == 'd', 'Sanitize.value: trimmed strings, default for empty or nil')
check(Sanitize.value(0 / 0, 'number', 7) == 7 and Sanitize.value(math.huge, 'number', 7) == 7 and Sanitize.value('5', 'number', 7) == 7, 'Sanitize.value: NaN, inf and the wrong type give the default')
check(Sanitize.numberRange(150, 0, 100) == 100 and Sanitize.numberRange(-5, 0, 100) == 0 and Sanitize.numberRange('x', 0, 100, 50) == 50, 'Sanitize.numberRange clamps, default when not a number')
check(Sanitize.allowlist('b', { 'a', 'b' }, 'a') == 'b' and Sanitize.allowlist('z', { 'a', 'b' }, 'a') == 'a', 'Sanitize.allowlist')
