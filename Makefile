.PHONY: build test types

setup:
	@rm -r ./node_modules/
	@npm i
	@npx playwright install

BUILD_DIR = ./dist		
build:
	@if [ -d "$(BUILD_DIR)" ]; then \
		echo "Removing $(BUILD_DIR)..."; \
		rm -r "$(BUILD_DIR)"; \
	fi
	@npm i
	./node_modules/.bin/rollup -c

pretty:
	@npx prettier ./src --write
	
lint:
	@npx eslint ./src --fix

check:
	@echo "Typechecking Js"
	./node_modules/.bin/tsc 

types:
	@rm -rf types
	@echo "Generating *.d.ts"
	@npx -p typescript tsc --project tsconfig.types.json

jsdoc: 
	@npm run generate-docs

serve:
	@npm run serve

PLAYWRIGHT_TEST := npx playwright test

test:
	@echo $(INFO) "Playwright test JS"
	@$(PLAYWRIGHT_TEST) 

test-ui:
	@echo $(INFO) "Playwright test JS with ui"
	@$(PLAYWRIGHT_TEST) --ui