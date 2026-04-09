#include "engine.h"
#include <stdlib.h>
#include <time.h>
#include <math.h>

// Explicitly declare rand and floor if headers are being fussy
extern int rand(void);
extern void srand(unsigned int seed);

void dino_init(GameEngine* engine) {
    engine->activeGame = GAME_DINO;
    engine->dino.x = 80;
    engine->dino.y = DINO_GROUND_Y;
    engine->dino.velocityY = 0;
    engine->dino.isJumping = false;
    engine->dino.isDucking = false;
    engine->dino.hasShield = false;
    engine->dino.powerUpTimer = 0;
    engine->dino.score = 0;
    engine->dino.gameOver = false;
    engine->difficulty = 0;

    for (int i = 0; i < MAX_CACTI; i++) engine->cacti[i].active = false;
    for (int i = 0; i < MAX_BIRDS; i++) engine->birds[i].active = false;
    
    // Load high score
    load_high_score(GAME_DINO, &engine->dino.highScore);
}

void dino_jump(GameEngine* engine) {
    if (!engine->dino.isJumping) {
        engine->dino.velocityY = DINO_JUMP_FORCE;
        engine->dino.isJumping = true;
    }
}

void dino_duck(GameEngine* engine, bool ducking) {
    engine->dino.isDucking = ducking;
}

void dino_update(GameEngine* engine) {
    if (engine->dino.gameOver) return;

    // Difficulty scaling
    engine->difficulty = (engine->dino.score / 1000);
    if (engine->difficulty > 50) engine->difficulty = 50;
    float speed = 7.0f + (engine->difficulty * 0.2f);

    // Physics
    engine->dino.velocityY += DINO_GRAVITY;
    engine->dino.y += engine->dino.velocityY;

    if (engine->dino.y >= DINO_GROUND_Y) {
        engine->dino.y = DINO_GROUND_Y;
        engine->dino.velocityY = 0;
        engine->dino.isJumping = false;
    }

    // Power-up logic
    if (engine->dino.hasShield) {
        engine->dino.powerUpTimer -= 0.016f;
        if (engine->dino.powerUpTimer <= 0) engine->dino.hasShield = false;
    } else if (engine->dino.score % 1500 == 0 && engine->dino.score > 0) {
        engine->dino.hasShield = true;
        engine->dino.powerUpTimer = 5.0f; // 5 seconds shield
    }

    engine->dino.score++;

    // Spawning Logic
    for (int i = 0; i < MAX_CACTI; i++) {
        if (!engine->cacti[i].active) {
            int prev = (i == 0) ? MAX_CACTI - 1 : i - 1;
            if (!engine->cacti[prev].active || engine->cacti[prev].x < 450 - (engine->difficulty * 2)) {
                engine->cacti[i].active = true;
                engine->cacti[i].x = CANVAS_WIDTH + (rand() % 200);
                engine->cacti[i].y = DINO_GROUND_Y + 10;
                engine->cacti[i].width = 25 + (rand() % 25);
                engine->cacti[i].height = 40 + (rand() % 35);
            }
        }

        if (engine->cacti[i].active) {
            engine->cacti[i].x -= speed;
            if (engine->cacti[i].x < -50) engine->cacti[i].active = false;

            // Collision
            if (engine->dino.x < engine->cacti[i].x + engine->cacti[i].width &&
                engine->dino.x + 35 > engine->cacti[i].x &&
                engine->dino.y < engine->cacti[i].y + engine->cacti[i].height &&
                engine->dino.y + 45 > engine->cacti[i].y) 
            {
                if (engine->dino.hasShield) {
                    engine->dino.hasShield = false;
                    engine->cacti[i].active = false;
                } else {
                    engine->dino.gameOver = true;
                    if (engine->dino.score > engine->dino.highScore) {
                        engine->dino.highScore = engine->dino.score;
                        save_high_score(GAME_DINO, engine->dino.highScore);
                    }
                }
            }
        }
    }

    // Bird logic (spawns at high scores)
    if (engine->dino.score > 2000) {
        for (int i = 0; i < MAX_BIRDS; i++) {
            if (!engine->birds[i].active && (rand() % 300 == 0)) {
                engine->birds[i].active = true;
                engine->birds[i].x = CANVAS_WIDTH;
                engine->birds[i].y = DINO_GROUND_Y - 50 - (rand() % 60);
                engine->birds[i].speed = speed + 2.0f;
            }
            if (engine->birds[i].active) {
                engine->birds[i].x -= engine->birds[i].speed;
                if (engine->birds[i].x < -50) engine->birds[i].active = false;
                
                // Bird Collision
                if (engine->dino.x < engine->birds[i].x + 40 &&
                    engine->dino.x + 35 > engine->birds[i].x &&
                    !engine->dino.isDucking &&
                    engine->dino.y - 45 < engine->birds[i].y + 20 &&
                    engine->dino.y > engine->birds[i].y) 
                {
                    if (engine->dino.hasShield) {
                        engine->dino.hasShield = false;
                        engine->birds[i].active = false;
                    } else {
                        engine->dino.gameOver = true;
                        if (engine->dino.score > engine->dino.highScore) {
                            engine->dino.highScore = engine->dino.score;
                            save_high_score(GAME_DINO, engine->dino.highScore);
                        }
                    }
                }
            }
        }
    }
}
