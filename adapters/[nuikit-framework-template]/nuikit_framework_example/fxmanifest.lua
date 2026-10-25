fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_framework_example'
description 'nuikit framework adapter template: a fake in-memory framework behind the contract in docs/adapters/framework-sdk.md.'
author '@belibathan'
version '0.9.0'

-- This line makes nuikit use this resource as the framework (bridge.lua finds it by the metadata, or force it
-- with `set nuikit_framework "nuikit_framework_example"`). Remove it from a template you are not using.
nuikit_framework 'example'

dependency 'nuikit'
client_script 'client.lua'
