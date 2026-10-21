fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_spike_route'
description 'nuikit adapter spike: plays the nuikit runtime for page routing. Receives intents from another resource (NUI callback and export), bounces them through its own frame, answers with timing.'
version '0.0.1'

client_script 'client.lua'

-- The "renderer frame": where the real runtime would draw the intent. Here it only answers.
ui_page 'web/index.html'
files { 'web/index.html' }
