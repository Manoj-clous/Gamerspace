#include "engine.h"
#include <stdlib.h>

// Explicitly declare rand for the compiler
extern int rand(void);

void flappy_init(GameEngine* engine) {
    engine->activeGame = GAME_FLAPPY;
    engine->bird.x = 100;
    engine->bird.y = CANVAS_HEIGHT / 2;
    engine->bird.velocityY = 0;
    engine->bird.score = 0;
    engine->bird.coins = 0;
    engine->bird.gameOver = false;
    engine->difficulty = 0;

    for (int i = 0; i < MAX_PIPES; i++) {
        engine->pipes[i].active = false;
        engine->pipes[i].passed = false;
    }
    
    // Load high score
    load_high_score(GAME_FLAPPY, &engine->bird.highScore);
}

void flappy_flap(GameEngine* engine) {
    engine->bird.velocityY = BIRD_LIFT;
}

void flappy_update(GameEngine* engine) {
    if (engine->bird.gameOver) return;

    // Difficulty scaling
    float speed = 3.5f + (engine->bird.score * 0.08f);
    if (speed > 8.0f) speed = 8.0f; // Speed cap
    
    engine->difficulty = (int)(engine->bird.score / 10);
    if (engine->difficulty > 20) engine->difficulty = 20;

    // Physics
    engine->bird.velocityY += BIRD_GRAVITY;
    engine->bird.y += engine->bird.velocityY;

    if (engine->bird.y < 0 || engine->bird.y > CANVAS_HEIGHT) {
        engine->bird.gameOver = true;
        if (engine->bird.score > engine->bird.highScore) {
            engine->bird.highScore = engine->bird.score;
            save_high_score(GAME_FLAPPY, engine->bird.highScore);
        }
    }

    // Pipe logic
    for (int i = 0; i < MAX_PIPES; i++) {
        if (!engine->pipes[i].active) {
            int prev = (i == 0) ? MAX_PIPES - 1 : i - 1;
            if (!engine->pipes[prev].active || engine->pipes[prev].x < CANVAS_WIDTH - 250) {
                engine->pipes[i].active = true;
                engine->pipes[i].x = CANVAS_WIDTH;
                
                // Calculate dynamic gap based on score
                float currentGap = INITIAL_PIPE_GAP - (engine->bird.score * 2.0f);
                if (currentGap < MIN_PIPE_GAP) currentGap = MIN_PIPE_GAP;
                engine->pipes[i].gap = currentGap;

                engine->pipes[i].topHeight = 60 + (rand() % (int)(CANVAS_HEIGHT - engine->pipes[i].gap - 120));
                engine->pipes[i].passed = false;
                
                // Moving pipes at difficulty 5+
                if (engine->difficulty >= 5 && (rand() % 2 == 0)) {
                    engine->pipes[i].moveY = 1.0f;
                    engine->pipes[i].moveSpeed = 1.0f + (rand() % 2);
                } else {
                    engine->pipes[i].moveY = 0;
                }
            }
        }

        if (engine->pipes[i].active) {
            engine->pipes[i].x -= speed;

            // Handle vertical movement
            if (engine->pipes[i].moveY != 0) {
                engine->pipes[i].topHeight += engine->pipes[i].moveY * engine->pipes[i].moveSpeed;
                if (engine->pipes[i].topHeight < 20 || engine->pipes[i].topHeight > CANVAS_HEIGHT - engine->pipes[i].gap - 20) {
                    engine->pipes[i].moveY *= -1;
                }
            }

            // Collision check
            float birdSize = 25.0f;
            if (engine->bird.x + birdSize > engine->pipes[i].x && 
                engine->bird.x < engine->pipes[i].x + PIPE_WIDTH) 
            {
                if (engine->bird.y < engine->pipes[i].topHeight || 
                    engine->bird.y + birdSize > engine->pipes[i].topHeight + engine->pipes[i].gap) 
                {
                    engine->bird.gameOver = true;
                    if (engine->bird.score > engine->bird.highScore) {
                        engine->bird.highScore = engine->bird.score;
                        save_high_score(GAME_FLAPPY, engine->bird.highScore);
                    }
                }
            }

            // Score check
            if (!engine->pipes[i].passed && engine->bird.x > engine->pipes[i].x + PIPE_WIDTH) {
                engine->pipes[i].passed = true;
                engine->bird.score++;
                if (rand() % 5 == 0) engine->bird.coins++; // Collectible coins
            }

            if (engine->pipes[i].x < -PIPE_WIDTH) {
                engine->pipes[i].active = false;
            }
        }
    }
}
