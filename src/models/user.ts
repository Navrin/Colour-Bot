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
    OneToMany,
} from 'typeorm';

import 'reflect-metadata';
import { ColourRequest } from './colourRequest';

@Entity()
@Index('user_id_index', (user: User) => [user.id])
export class User {
    @PrimaryColumn()
    @Index()
    id: string;

    @ManyToMany(type => Guild, guild => guild.users)
    @JoinTable()
    guilds: Guild[] = [];

    @OneToMany(type => ColourRequest, request => request.user)
    requests: ColourRequest[];
}
