import {ManyToOne, Index, Column,  Entity,  PrimaryGeneratedColumn} from 'typeorm';
import { Guild } from './guild';
import { User } from './user';
import 'reflect-metadata';

@Entity()
@Index('request_id_index', (request: ColourRequest) => [request.id])
export class ColourRequest {
    @PrimaryGeneratedColumn()
    @Index()
    id: number;
    
    @Column()
    colour: string;

    @ManyToOne(type => Guild, {
        cascadeAll: true,
    })
    guild: Guild;

    @ManyToOne(type => User, {
        cascadeAll: true,
    })
    user: User;
}
