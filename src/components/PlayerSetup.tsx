import { useState } from 'react';
import { useAtom } from 'jotai';
import { Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { playersAtom } from '@/lib/store';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable player item component
function SortablePlayerItem({ player, onRemove }: { player: { id: string; name: string }; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`flex items-center justify-between p-2 ${isDragging ? 'bg-accent' : 'bg-muted'} rounded-md border-2 ${isDragging ? 'border-primary' : 'border-transparent'} cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span>{player.name}</span>
      </div>
      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <Button 
          variant="destructive" 
          size="icon" 
          onClick={() => onRemove(player.id)}
          className="h-8 w-8 flex items-center justify-center p-0"
          aria-label={`Remove ${player.name}`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-white"
          >
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </Button>
      </div>
    </div>
  );
}

export function PlayerSetup() {
  const [players, setPlayers] = useAtom(playersAtom);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([...players, { id: crypto.randomUUID(), name: newPlayerName.trim() }]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((player) => player.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setPlayers((players) => {
        const oldIndex = players.findIndex((player) => player.id === active.id);
        const newIndex = players.findIndex((player) => player.id === over.id);
        
        return arrayMove(players, oldIndex, newIndex);
      });
    }
  };

  return (
    <Accordion type="single" collapsible defaultValue="players" className="w-full">
      <AccordionItem value="players" className="border rounded-lg overflow-hidden">
        <div className="bg-background">
          <AccordionTrigger className="px-6 py-4 hover:no-underline bg-white">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-semibold">Players ({players.length})</h3>
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent className="px-6 pb-4 pt-1 bg-background">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              />
              <Button onClick={addPlayer}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="grid gap-2">
                <SortableContext items={players.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  {players.map((player) => (
                    <SortablePlayerItem 
                      key={player.id} 
                      player={player} 
                      onRemove={removePlayer} 
                    />
                  ))}
                </SortableContext>
              </div>
            </DndContext>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}