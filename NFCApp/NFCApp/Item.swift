//
//  Item.swift
//  NFCApp
//
//  Created by Jatin Maurya on 24/12/25.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
