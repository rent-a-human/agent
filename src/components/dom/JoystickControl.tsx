import { Joystick } from 'react-joystick-component';
import { useStore } from '../../store/useStore';

export const JoystickControl = () => {
    const setJoystickInput = useStore((state) => state.setJoystickInput);

    const handleMove = (event: any) => {
        // x and y are between -1 and 1 usually, assuming default props?
        // react-joystick-component returns x/y in event object.
        if (event) {
            setJoystickInput({ x: event.x || 0, y: event.y || 0 });
        }
    };

    const handleStop = () => {
        setJoystickInput({ x: 0, y: 0 });
    };

    return (
        <div 
            className="fixed z-50 pointer-events-auto opacity-50 hover:opacity-100 transition-opacity"
            style={{ left: '2rem', bottom: '2rem' }}
        >
            <Joystick 
                size={100} 
                sticky={false} 
                baseColor="rgba(0, 0, 0, 0.5)" 
                stickColor="rgba(0, 240, 255, 0.8)" 
                move={handleMove} 
                stop={handleStop}
            />
        </div>
    );
};
