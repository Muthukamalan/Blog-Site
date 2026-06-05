.PHONY: clean 

clean: ## clear __pycache__ dir
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +