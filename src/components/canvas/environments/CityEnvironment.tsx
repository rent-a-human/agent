import { Sky, Environment, Box, Plane } from '@react-three/drei';

// Procedurally generate a simple grid of building boxes
const buildingPositions: [number, number, number][] = [];
const buildingHeights: number[] = [];

// Simple 5x5 grid city block outline
for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
        // Leave center empty for the player/dashboard
        if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) continue;
        
        buildingPositions.push([x * 12, 0, z * 12]);
        buildingHeights.push(Math.random() * 15 + 10); // Random height 10-25m
    }
}

export const CityEnvironment = () => {
    return (
        <group>
            {/* City Lighting & Skybox */}
            <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} turbidity={5} rayleigh={1.2} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 5]} intensity={1.5} castShadow />
            <fog attach="fog" args={['#a0b4c8', 10, 80]} />
            <Environment preset="city" />

            {/* Paved Road Area */}
            <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
                <meshStandardMaterial color="#2d3436" roughness={0.8} metalness={0.1} />
            </Plane>

            {/* Sidewalk perimeter */}
            <Box args={[32, 0.2, 32]} position={[0, -1.4, 0]} receiveShadow>
                <meshStandardMaterial color="#636e72" roughness={0.9} />
            </Box>

            {/* Simple Procedural Buildings */}
            <group position={[0, -1.5, 0]}>
                {buildingPositions.map((pos, index) => {
                    const height = buildingHeights[index];
                    return (
                        <Box key={index} args={[8, height, 8]} position={[pos[0], height / 2, pos[2]]} castShadow receiveShadow>
                            <meshStandardMaterial 
                                color="#dfe6e9" 
                                roughness={0.7} 
                                metalness={0.3} 
                                envMapIntensity={0.8}
                            />
                        </Box>
                    );
                })}
            </group>
        </group>
    );
};
