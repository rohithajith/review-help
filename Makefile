SHELL := /bin/zsh

.PHONY: up wait seed start down dev

up:
	docker-compose up -d

wait:
	node backend/waitForPostgres.js

seed:
	node backend/seedTenants.js


start:
	(cd backend && npm start)

# start backend in background and write pid/log
start-bg:
	@echo "Starting backend in background (logs -> /tmp/review-backend.log)"
	@cd backend && nohup npm start > /tmp/review-backend.log 2>&1 & echo $$! > /tmp/review-backend.pid || true
	@sleep 1

stop-backend:
	@if [ -f /tmp/review-backend.pid ]; then \
		PID=$$(cat /tmp/review-backend.pid) && echo "Killing backend pid $$PID" && kill $$PID || true; \
		rm -f /tmp/review-backend.pid || true; \
	else \
		echo "No backend pid file found"; \
	fi

browse:
	open http://localhost:3000 || echo "Open failed: please open http://localhost:3000 manually"

dev: up wait seed start-bg browse

logs:
	@echo "Tailing backend and postgres logs (press Ctrl-C to stop)"
	@docker-compose logs -f postgres &
	tail -n +1 -f /tmp/review-backend.log

down:
	docker-compose down -v
