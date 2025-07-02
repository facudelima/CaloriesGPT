import React, { useState } from 'react';
import { Search, ArrowRight, Loader2, FileWarning as Running, Flame, MoveRight, Upload } from 'lucide-react';
import OpenAI from 'openai';
import CameraCapture from './components/CameraCapture';

interface CalorieEntry {
  food: string;
  calories: number;
  timestamp: Date;
  image?: string;
}

function App() {
  const [foodInput, setFoodInput] = useState('');
  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  const [estimatedCalories, setEstimatedCalories] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const calculateRunningTime = (calories: number) => {
    // At 8 km/h, 10 calories are burned per minute
    const minutes = Math.round(calories / 10);
    return minutes;
  };

  const handleImageCapture = async (file: File) => {
    setIsLoading(true);
    try {
      // Convert the file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          try {
            // First, analyze the image to identify the food
            const visionResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "What food item is shown in this image? Please respond with just the name of the food, no additional text." },
                    {
                      type: "image_url",
                      image_url: {
                        url: reader.result
                      }
                    }
                  ],
                }
              ],
              max_tokens: 50
            });

            const identifiedFood = visionResponse.choices[0].message.content || "Unknown Food";
            
            // Then, estimate calories for the identified food
            const calorieResponse = await openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are a nutritionist expert. Provide only the numeric calorie estimate for the given food item. Respond with just the number, no additional text."
                },
                {
                  role: "user",
                  content: `How many calories are in: ${identifiedFood}`
                }
              ],
              temperature: 0.7,
              max_tokens: 10
            });

            const calories = parseInt(calorieResponse.choices[0].message.content || "0");
            
            // Create new entry
            const newEntry = {
              food: identifiedFood,
              calories: isNaN(calories) ? 0 : calories,
              timestamp: new Date(),
              image: reader.result
            };

            setEntries(prev => [newEntry, ...prev]);
            setEstimatedCalories(prev => prev + (isNaN(calories) ? 0 : calories));
          } catch (error) {
            console.error('Error processing image with OpenAI:', error);
            // Still add the entry but with 0 calories
            const newEntry = {
              food: 'Unknown Food',
              calories: 0,
              timestamp: new Date(),
              image: reader.result
            };
            setEntries(prev => [newEntry, ...prev]);
          }
        }
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setIsLoading(false);
    }
  };

  const estimateCalories = async (food: string) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a nutritionist expert. Provide only the numeric calorie estimate for the given food item. Respond with just the number, no additional text."
          },
          {
            role: "user",
            content: `How many calories are in: ${food}`
          }
        ],
        temperature: 0.7,
        max_tokens: 10
      });

      const calories = parseInt(response.choices[0].message.content || "0");
      return isNaN(calories) ? 0 : calories;
    } catch (error) {
      console.error('Error estimating calories:', error);
      return 0;
    }
  };

  const handleAddEntry = async () => {
    if (!foodInput.trim()) return;
    
    setIsLoading(true);
    try {
      const calories = await estimateCalories(foodInput);
      const newEntry = {
        food: foodInput,
        calories,
        timestamp: new Date(),
      };
      
      setEntries([newEntry, ...entries]);
      setEstimatedCalories(prev => prev + calories);
      setFoodInput('');
    } catch (error) {
      console.error('Error adding entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAddEntry();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">Calorie Counter</h1>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-md">
        {/* Input Section */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-lg">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={foodInput}
              onChange={(e) => setFoodInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter food description..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleAddEntry}
              disabled={isLoading || !foodInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Search className="w-6 h-6" />
              )}
            </button>
            <CameraCapture onImageCapture={handleImageCapture} />
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-lg">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Estimated Calories</h2>
                <p className="text-3xl font-bold text-blue-400">{estimatedCalories}</p>
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Running className="w-5 h-5 text-purple-400" />
                <MoveRight className="w-4 h-4 text-gray-400" />
                <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
              </div>
              <p className="text-sm text-gray-300">
                You need to run for <span className="font-bold text-purple-400">{calculateRunningTime(estimatedCalories)} minutes</span> at <span className="font-bold text-purple-400">8 KPH</span> to burn these calories
              </p>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{entry.food}</h3>
                  <p className="text-sm text-gray-400">
                    {entry.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-bold text-blue-400">{entry.calories} cal</p>
                  <div className="flex items-center text-purple-400 bg-gray-700 rounded-md px-2 py-1">
                    <Running className="w-4 h-4 mr-1" />
                    <span className="text-sm">{calculateRunningTime(entry.calories)}m</span>
                  </div>
                </div>
              </div>
              {entry.image && (
                <div className="mt-2">
                  <img src={entry.image} alt={entry.food} className="rounded-lg w-full h-48 object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-gray-800 p-4 text-center text-sm">
        <p className="text-gray-400">
          Made by Facu De Lima
        </p>
      </footer>
    </div>
  );
}

export default App;