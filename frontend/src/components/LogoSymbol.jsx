import React, { useEffect, useRef } from 'react';

const LogoSymbol = () => {
  const robotRef = useRef(null);
  
  useEffect(() => {
    const robot = robotRef.current;
    if (robot) {
      // Анимация покачивания
      const bounceAnimation = robot.animate(
        [
          { transform: 'translateY(0px)' },
          { transform: 'translateY(-3px)' },
          { transform: 'translateY(0px)' }
        ],
        {
          duration: 2000,
          iterations: Infinity,
          easing: 'ease-in-out'
        }
      );
      
      // Создаем анимацию подмигивания с увеличением и поворотом
      const winkAnimation = setInterval(() => {
        // Приостанавливаем анимацию покачивания
        bounceAnimation.pause();
        
        // Создаем комплексную анимацию
        const complexAnimation = robot.animate(
          [
            // Начальное состояние
            { transform: 'scale(1) rotate(0deg)' },
            // Увеличение и поворот
            { transform: 'scale(1.1) rotate(15deg)', offset: 0.3 },
            // Держим увеличение и поворот во время подмигивания
            { transform: 'scale(1.1) rotate(15deg)', offset: 0.6 },
            // Возвращаемся к исходному состоянию
            { transform: 'scale(1) rotate(0deg)' }
          ],
          {
            duration: 2000,
            iterations: 1,
            easing: 'ease-in-out'
          }
        );
        
        // Находим правый глаз робота для подмигивания
        setTimeout(() => {
          // Добавляем элемент для анимации подмигивания
          const winkElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
          winkElement.setAttribute("d", "M40.9355 20.8965C38.7482 20.8965 36.967 22.6743 36.9668 24.8574C36.9668 25.5 38.748 25.5 40.9355 25.5C43.123 25.5 44.9043 25.5 44.9043 24.8574C44.9041 22.6743 43.1229 20.8965 40.9355 20.8965Z");
          winkElement.setAttribute("fill", "white");
          winkElement.style.opacity = "0";
          
          const svgElement = robot.querySelector('svg');
          svgElement.appendChild(winkElement);
          
          // Анимация подмигивания с более плавными переходами
          const wink = winkElement.animate(
            [
              { opacity: 0 },
              { opacity: 1, offset: 0.2 },
              { opacity: 1, offset: 0.8 },
              { opacity: 0 }
            ],
            {
              duration: 800,
              iterations: 1,
              easing: 'ease-in-out'
            }
          );
          
          // Удаляем элемент после анимации
          wink.onfinish = () => {
            winkElement.remove();
          };
        }, 600); // Запускаем подмигивание через 600мс после начала анимации поворота
        
        // Возобновляем анимацию покачивания после завершения комплексной анимации
        complexAnimation.onfinish = () => {
          bounceAnimation.play();
        };
      }, 8000); // Интервал между анимациями - 8 секунд
      
      return () => {
        bounceAnimation.cancel();
        clearInterval(winkAnimation);
      };
    }
  }, []);
  
  return (
    <div data-layer="Logo symbol" className="LogoSymbol w-[80px] h-[74px] relative overflow-hidden">
      <div data-svg-wrapper data-layer="Bubble" className="Bubble left-0 top-0 absolute">
        <svg width="80" height="74" viewBox="0 0 80 74" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M62.4375 0.764583H17.5625C7.84375 0.764583 0 8.78042 0 18.6677V46.3956C0 56.2828 7.875 64.2986 17.5625 64.2986H31.125C32.0312 64.2986 32.7812 65.0472 32.7812 65.9829L32.8437 71.7219C32.8437 72.9695 34.2187 73.6868 35.2187 73.0006L46.9375 64.8913C47.5 64.4858 48.1875 64.2674 48.875 64.2674H62.4375C72.1562 64.2674 80 56.2516 80 46.3644V18.6365C80 8.74922 72.125 0.733398 62.4375 0.733398V0.764583Z" fill="#F85A00"/>
        </svg>
      </div>
      <div ref={robotRef} data-svg-wrapper data-layer="robot" className="Robot left-[9.75px] top-[8.95px] absolute origin-center">
        <svg width="62" height="45" viewBox="0 0 62 45" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30.9355 0.685547C32.6543 0.68555 34.0605 2.08924 34.0605 3.80469C34.0605 5.14579 33.248 6.29967 32.0605 6.73633V9.01367H42.4355C49.3105 9.01368 54.9355 14.5963 54.9355 21.4893V32.0625C54.9355 38.9243 49.3418 44.5391 42.4355 44.5391H19.4043C12.5293 44.5391 6.9043 38.9555 6.9043 32.0625V21.4893C6.90431 14.6275 12.4981 9.01367 19.4043 9.01367H29.8105V6.73633C28.6543 6.26849 27.8106 5.14579 27.8105 3.80469C27.8105 2.08924 29.2168 0.685547 30.9355 0.685547ZM38.2168 33.0293C37.8417 32.468 37.0605 32.3436 36.5293 32.749C35.5605 33.4352 33.5917 34.5889 30.873 34.6201C27.9981 34.6825 25.9043 33.4664 24.9043 32.749C24.3731 32.3748 23.6231 32.4992 23.2168 33.0293C22.8418 33.5595 22.9668 34.3084 23.498 34.7139C24.7168 35.5872 27.2481 37.0527 30.7168 37.0527H30.9043C34.2793 36.9904 36.748 35.556 37.9355 34.7139C38.498 34.3396 38.623 33.5595 38.2168 33.0293ZM4.40527 34.2764C2.37402 34.2764 0.749023 32.6231 0.749023 30.627V23.7344C0.749023 21.707 2.40527 20.085 4.40527 20.085V34.2764ZM57.501 20.085C59.5322 20.085 61.1572 21.7382 61.1572 23.7344V30.627C61.1572 32.6543 59.501 34.2764 57.501 34.2764V20.085ZM20.8418 20.9277C18.6544 20.9277 16.8732 22.7055 16.873 24.8887C16.873 27.072 18.6543 28.8506 20.8418 28.8506C23.0293 28.8506 24.8105 27.072 24.8105 24.8887C24.8104 22.7055 23.0292 20.9277 20.8418 20.9277ZM40.9355 20.8965C38.7482 20.8965 36.967 22.6743 36.9668 24.8574C36.9668 27.0407 38.748 28.8193 40.9355 28.8193C43.123 28.8193 44.9043 27.0407 44.9043 24.8574C44.9041 22.6743 43.1229 20.8965 40.9355 20.8965Z" fill="white" className="robot-path"/>
        </svg>
      </div>
    </div>
  );
};

export default LogoSymbol; 