import { Guild } from './guild';
import { Colour } from './colour';
import { 
    Entity, 
    Column, 
    PrimaryColumn, 
    OneToOne, 
    ManyToOne, 
    ManyToMany,
    JoinTable,
    Index,
} from 'typeorm';

import 'reflect-metadata';

@Entity()
@Index('user_id_index', (user: User) => [user.id])
export class User {
    @PrimaryColumn()
    @Index()
    id: string;

    @ManyToMany(type => Guild, guild => guild.users)
    @JoinTable()
    guilds: Guild[] = [];
}
