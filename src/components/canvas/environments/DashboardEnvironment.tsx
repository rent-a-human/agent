import { Grid } from '@react-three/drei';

export const DashboardEnvironment = () => {
    return (
        <>
            <color attach="background" args={['#050a14']} />
            
            {/* Ambient & Fog */}
            <fog attach="fog" args={['#050a14', 5, 15]} />
            <ambientLight intensity={0.5} />

            <Grid 
                position={[0, -1.5, 0]} 
                args={[20, 20]} 
                cellSize={1} 
                cellThickness={1} 
                cellColor="#00f0ff" 
                sectionSize={5} 
                sectionThickness={1.5} 
                sectionColor="#0077ff" 
                fadeDistance={15} 
                fadeStrength={1} 
                followCamera={false} 
                infiniteGrid={true}
            />
        </>
    );
};
