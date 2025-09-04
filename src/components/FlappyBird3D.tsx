
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BIRD_SIZE = 20;
const BIRD_X = 80;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const GRAVITY = 0.28;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 3;
const GROUND_HEIGHT = 80;

const FlappyBird: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0); //i change this useRef<number>() into this useRef<number>(0)
  const pipesRef = useRef<Pipe[]>([]);
  const lastPipeTime = useRef(0);
  
  const [birdY, setBirdY] = useState(CANVAS_HEIGHT / 2 - 50);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'gameOver'>('waiting');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Create pipe
  const createPipe = (): Pipe => {
    const minHeight = 50;
    const maxHeight = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    return {
      x: CANVAS_WIDTH,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      passed: false
    };
  };

  // Check collision
  const checkCollision = (y: number): boolean => {
    // Ground collision
    if (y + BIRD_SIZE / 2 >= CANVAS_HEIGHT - GROUND_HEIGHT) return true;
    // Ceiling collision
    if (y - BIRD_SIZE / 2 <= 0) return true;

    // Pipe collision
    for (const pipe of pipesRef.current) {
      if (
        BIRD_X + BIRD_SIZE / 2 > pipe.x &&
        BIRD_X - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH
      ) {
        if (
          y - BIRD_SIZE / 2 < pipe.topHeight ||
          y + BIRD_SIZE / 2 > pipe.bottomY
        ) {
          return true;
        }
      }
    }
    return false;
  };

  // Draw game
  const draw = useCallback((ctx: CanvasRenderingContext2D, currentBirdY: number) => {
    // Clear canvas
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw clouds
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 3; i++) {
      const x = (i * 150 + Date.now() * 0.02) % (CANVAS_WIDTH + 60) - 60;
      const y = 50 + i * 40;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
      ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw pipes
    ctx.fillStyle = '#5cb85c';
    pipesRef.current.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Top pipe cap
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, PIPE_WIDTH + 10, 30);
      
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, CANVAS_HEIGHT - pipe.bottomY - GROUND_HEIGHT);
      // Bottom pipe cap
      ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 30);
    });

    // Draw pipe highlights
    ctx.fillStyle = '#6bcf6b';
    pipesRef.current.forEach(pipe => {
      // Top pipe highlight
      ctx.fillRect(pipe.x + 5, 0, 8, pipe.topHeight);
      ctx.fillRect(pipe.x, pipe.topHeight - 30, 8, 30);
      
      // Bottom pipe highlight
      ctx.fillRect(pipe.x + 5, pipe.bottomY, 8, CANVAS_HEIGHT - pipe.bottomY - GROUND_HEIGHT);
      ctx.fillRect(pipe.x, pipe.bottomY, 8, 30);
    });

    // Draw ground
    ctx.fillStyle = '#dec05b';
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    
    // Ground texture
    ctx.fillStyle = '#deb045';
    for (let i = 0; i < CANVAS_WIDTH; i += 20) {
      ctx.fillRect(i, CANVAS_HEIGHT - GROUND_HEIGHT, 2, GROUND_HEIGHT);
    }

    // Draw bird
    const birdRadius = BIRD_SIZE / 2;
    ctx.save();
    ctx.translate(BIRD_X, currentBirdY);
    
    // Bird rotation based on velocity
    const rotation = Math.min(Math.max(birdVelocity * 0.05, -0.5), 0.5);
    ctx.rotate(rotation);
    
    // Bird body
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird wing
    if (gameState === 'playing') {
      const wingFlap = Math.sin(Date.now() * 0.02) > 0;
      ctx.fillStyle = '#ffb347';
      if (wingFlap) {
        ctx.fillRect(-8, -3, 12, 6);
      } else {
        ctx.fillRect(-8, 3, 12, 6);
      }
    }
    
    // Bird eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(6, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird beak
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 2);
    ctx.lineTo(12, 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(score.toString(), CANVAS_WIDTH / 2, 60);
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 60);
  }, [birdVelocity, gameState, score]);

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState === 'playing') {
      // Update bird physics
      setBirdVelocity(prev => prev + GRAVITY);
      setBirdY(prev => {
        const newY = prev + birdVelocity;
        
        // Check collision
        if (checkCollision(newY)) {
          setGameState('gameOver');
          setHighScore(prevHigh => Math.max(prevHigh, score));
          return prev;
        }
        
        return newY;
      });

      // Update pipes
      pipesRef.current = pipesRef.current.filter(pipe => {
        pipe.x -= PIPE_SPEED;
        
        // Score when bird passes pipe
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          setScore(prev => prev + 1);
        }
        
        // Remove pipes that are off screen
        return pipe.x > -PIPE_WIDTH;
      });

      // Add new pipes
      const currentTime = Date.now();
      if (currentTime - lastPipeTime.current > 2000) {
        pipesRef.current.push(createPipe());
        lastPipeTime.current = currentTime;
      }
    }

    // Draw everything
    draw(ctx, birdY);

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, birdY, birdVelocity, score, draw]);

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  // Handle jump
  const handleJump = useCallback(() => {
    if (gameState === 'waiting') {
      setGameState('playing');
      setBirdVelocity(JUMP_STRENGTH);
      lastPipeTime.current = Date.now();
    } else if (gameState === 'playing') {
      setBirdVelocity(JUMP_STRENGTH);
    } else if (gameState === 'gameOver') {
      // Reset game
      setBirdY(CANVAS_HEIGHT / 2 - 50);
      setBirdVelocity(0);
      setScore(0);
      pipesRef.current = [];
      lastPipeTime.current = 0;
      setGameState('waiting');
    }
  }, [gameState]);

  // Event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };

    const handleClick = () => {
      handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [handleJump]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-400 to-blue-500 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
          🐦 Flappy Bird
        </h1>
        <div className="bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
          <span className="text-white font-semibold">
            High Score: <span className="text-yellow-300">{highScore}</span>
          </span>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-white/40 rounded-lg shadow-2xl cursor-pointer bg-sky-300"
          onClick={handleJump}
        />

        {/* Game State Overlays */}
        {gameState === 'waiting' && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center text-white p-6 bg-emerald-500/90 rounded-xl shadow-xl border border-white/30 mx-4">
              <div className="text-2xl font-bold mb-3">🚀 Ready to Fly?</div>
              <div className="text-lg mb-2">Tap or press SPACE to start!</div>
              <div className="text-sm opacity-90">Avoid the green pipes</div>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center text-white p-6 bg-red-500/90 rounded-xl shadow-xl border border-white/30 mx-4">
              <div className="text-3xl font-bold mb-3">💥 Game Over!</div>
              <div className="text-xl mb-2">
                Final Score: <span className="text-yellow-300">{score}</span>
              </div>
              {score === highScore && score > 0 && (
                <div className="text-lg mb-3 text-yellow-300 animate-pulse">
                  🏆 New High Score!
                </div>
              )}
              <div className="text-sm opacity-90">Tap to restart</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
          <span className="text-white text-sm">
            🎮 Controls: <strong>SPACE</strong> or <strong>Click</strong> to flap
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlappyBird;